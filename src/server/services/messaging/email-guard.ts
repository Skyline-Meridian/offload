import 'server-only'

import { db } from '@/server/db'
import { registerEmailGuard } from '@/server/outbox-handlers'

const QUIET_MINUTES = 15

/**
 * Before a "new message" email goes out (04 section 5.5):
 * - skip it when the recipient's inbox has been read since the message was written (checked live, MSG-1.15)
 * - skip it when another one for the same conversation and person was sent in the last 15 minutes
 */
export function registerMessageEmailGuard(): void {
  registerEmailGuard('message.new', async (payload) => {
    const context = payload.context
    if (!context?.conversationId || !context.messageId || !context.partyKey) return true

    const message = await db.message.findUnique({ where: { id: context.messageId }, select: { createdAt: true } })
    if (!message) return false

    const [kind, id] = context.partyKey.split(':')
    const party = await db.conversationParty.findFirst({
      where: {
        conversationId: context.conversationId,
        ...(kind === 'U' ? { kind: 'USER', userId: id } : { kind: 'ORGANISATION', organisationId: id }),
      },
      select: { lastReadAt: true },
    })
    if (party?.lastReadAt && party.lastReadAt >= message.createdAt) return false

    const since = new Date(Date.now() - QUIET_MINUTES * 60_000)
    const recent = await db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "OutboxMessage"
      WHERE "type" = 'email.send' AND "status" = 'SENT' AND "updatedAt" > ${since}
        AND "payload"->>'type' = 'message.new'
        AND "payload"->>'userId' = ${payload.userId ?? ''}
        AND "payload"->'context'->>'conversationId' = ${context.conversationId}
      LIMIT 1`
    return recent.length === 0
  })
}
