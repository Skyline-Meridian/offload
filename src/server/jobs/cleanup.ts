import 'server-only'

import { db } from '@/server/db'
import { purgeRateLimits } from '@/server/rate-limit'

const DAY_MS = 86_400_000

/** Removes expired sessions, verification tokens, old rate limit counters and uploads that were never finished. */
export async function cleanup(): Promise<Record<string, number>> {
  const now = new Date()
  const [sessions, verifications, tokens, rateLimits, files, sent] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.token.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * DAY_MS) } } }),
    purgeRateLimits(),
    db.file.updateMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(now.getTime() - DAY_MS) } },
      data: { status: 'REJECTED', rejectReason: 'Upload not completed' },
    }),
    db.outboxMessage.deleteMany({ where: { status: 'SENT', createdAt: { lt: new Date(now.getTime() - 30 * DAY_MS) } } }),
  ])
  return {
    sessions: sessions.count,
    verifications: verifications.count,
    tokens: tokens.count,
    rateLimits,
    abandonedUploads: files.count,
    sentOutbox: sent.count,
  }
}
