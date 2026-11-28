import 'server-only'

import type { Tx } from '@/server/db'

/**
 * Events carry ids only. `parties` are channel names ("U:<userId>", "O:<organisationId>"): the realtime
 * server sends the event to every connection that listens on one of them.
 */
export type RealtimeEvent =
  | { type: 'notification.created'; userId: string }
  | { type: 'message.created'; conversationId: string; messageId: string; parties: string[] }
  | { type: 'conversation.read'; conversationId: string; parties: string[] }
  | { type: 'membership.changed'; userId: string }
  | { type: 'session.revoked'; userId: string }

/** Publishes inside the caller's transaction, so listeners hear about it only after commit. */
export async function notifyRealtime(tx: Tx, event: RealtimeEvent): Promise<void> {
  // pg_notify returns void, which the client cannot read back, so it runs as a statement.
  await tx.$executeRaw`SELECT pg_notify('realtime', ${JSON.stringify(event)})`
}
