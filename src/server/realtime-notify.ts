import 'server-only'

import type { Tx } from '@/server/db'

/** Events carry ids only. The realtime server looks up what each connected user may see. */
export type RealtimeEvent =
  | { type: 'notification.created'; userId: string }
  | { type: 'message.created'; conversationId: string; messageId: string }
  | { type: 'conversation.read'; conversationId: string; partyId: string }
  | { type: 'membership.changed'; userId: string }

/** Publishes inside the caller's transaction, so listeners hear about it only after commit. */
export async function notifyRealtime(tx: Tx, event: RealtimeEvent): Promise<void> {
  await tx.$queryRaw`SELECT pg_notify('realtime', ${JSON.stringify(event)})`
}
