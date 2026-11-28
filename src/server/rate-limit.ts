import 'server-only'

import { RATE_LIMITS, type RateLimitName } from '@/lib/constants'
import { db } from '@/server/db'

export type RateLimitResult = { allowed: boolean; count: number; retryAfter: number | null }

/**
 * Fixed window counter in one atomic statement: it starts a new window when the old one has passed,
 * otherwise adds one, and returns the new count and the seconds left in the window.
 */
export async function consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<{ count: number; remaining: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "updatedAt")
    VALUES (${key}, 1, now(), now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - (${windowSeconds}::int * interval '1 second')
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - (${windowSeconds}::int * interval '1 second')
                           THEN now() ELSE "RateLimit"."windowStart" END,
      "updatedAt" = now()
    RETURNING "count",
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("windowStart" + (${windowSeconds}::int * interval '1 second') - now()))))::int AS "remaining"`
  const count = Number(rows[0]?.count ?? 1)
  const allowed = count <= limit
  return { allowed, count, retryAfter: allowed ? null : Number(rows[0]?.remaining ?? windowSeconds) }
}

export function hit(name: RateLimitName, subject: string): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMITS[name]
  return consume(`${name}:${subject}`, limit, windowSeconds)
}

/** Removes counters whose window ended long ago. Called by the cleanup job. */
export async function purgeRateLimits(): Promise<number> {
  const result = await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 2 * 86_400_000) } } })
  return result.count
}
