import 'server-only'

import { z } from 'zod'

import type { Prisma } from '@/generated/prisma/client'
import type { Tx } from '@/server/db'

export const outboxPayloads = {
  'email.send': z.object({
    type: z.string().min(1),
    to: z.email(),
    variables: z.record(z.string(), z.string()),
    replyTo: z.email().optional(),
    /** Recipient user, when there is one, so the worker can skip undeliverable addresses. */
    userId: z.uuid().optional(),
    /** Used by the worker to skip emails that are no longer needed (for example a read message). */
    context: z.record(z.string(), z.string()).optional(),
  }),
  'newsletter.subscribe': z.object({ userId: z.uuid() }),
  'newsletter.unsubscribe': z.object({ userId: z.uuid() }),
  'image.process': z.object({ fileId: z.uuid() }),
  'export.user-data': z.object({ userId: z.uuid() }),
  'export.users-csv': z.object({ requestedById: z.uuid(), filters: z.record(z.string(), z.string()) }),
} as const

export type OutboxType = keyof typeof outboxPayloads
export type OutboxPayload<T extends OutboxType> = z.infer<(typeof outboxPayloads)[T]>

/** Adds a message to the outbox in the caller's transaction. It is sent after the transaction commits. */
export async function enqueue<T extends OutboxType>(tx: Tx, type: T, payload: OutboxPayload<T>): Promise<void> {
  const parsed = outboxPayloads[type].parse(payload)
  await tx.outboxMessage.create({ data: { type, payload: parsed as Prisma.InputJsonValue } })
}
