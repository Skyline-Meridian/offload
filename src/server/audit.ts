import 'server-only'

import type { Prisma, UserRole } from '@/generated/prisma/client'
import { currentActor } from '@/server/context'
import type { Tx } from '@/server/db'

export type AuditInput = {
  /** For example "verification.approved". Dotted, lower case. */
  action: string
  subjectType: string
  subjectId: string
  relatedUserIds?: string[]
  relatedOrgId?: string | null
  /** Ids, status names and counts only. Free text, names, emails and document names are removed. */
  data?: Record<string, unknown>
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ip?: string | null
}

const forbiddenKey = /email|token|password|secret|phone|body|note|fileName|documentName|name$/i

function scrub(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!value) return undefined
  const out: Record<string, Prisma.InputJsonValue | null> = {}
  for (const [k, v] of Object.entries(value)) {
    if (forbiddenKey.test(k) && !/^(status|documentStatus)$/.test(k)) continue
    if (v === undefined) continue
    out[k] = v instanceof Date ? v.toISOString() : (v as Prisma.InputJsonValue | null)
  }
  return out
}

/** Writes one append-only audit event inside the caller's transaction. */
export async function audit(tx: Tx, input: AuditInput): Promise<void> {
  const actor = currentActor()
  await tx.auditEvent.create({
    data: {
      actorKind: actor.actorId ? 'USER' : 'SYSTEM',
      actorId: actor.actorId,
      systemActor: actor.actorId ? null : (actor.systemName ?? 'system'),
      actorRole: (actor.role as UserRole | null) ?? null,
      action: input.action,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      relatedUserIds: input.relatedUserIds ?? [],
      relatedOrgId: input.relatedOrgId ?? null,
      data: scrub(input.data),
      before: scrub(input.before),
      after: scrub(input.after),
      ip: input.ip ?? null,
    },
  })
}
