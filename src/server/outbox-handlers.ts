import 'server-only'

import { db } from '@/server/db'
import { deliverEmail } from '@/server/email/driver'
import { templateIdFor } from '@/server/email/send'
import { subscribeToNewsletter, unsubscribeFromNewsletter } from '@/server/integrations/newsletter'
import { log } from '@/server/log'
import { outboxPayloads, type OutboxPayload, type OutboxType } from '@/server/outbox'

type Handler<T extends OutboxType> = (payload: OutboxPayload<T>) => Promise<void>

/** Checks run just before an email is sent. Return false to skip it (for example a read message). */
type EmailGuard = (payload: OutboxPayload<'email.send'>) => Promise<boolean>
const emailGuards = new Map<string, EmailGuard>()

export function registerEmailGuard(emailType: string, guard: EmailGuard): void {
  emailGuards.set(emailType, guard)
}

const handlers: { [T in OutboxType]?: Handler<T> } = {
  'email.send': async (payload) => {
    if (payload.userId) {
      const user = await db.user.findUnique({ where: { id: payload.userId }, select: { isEmailUndeliverable: true } })
      if (user?.isEmailUndeliverable) {
        log.info('email skipped, address undeliverable', { emailType: payload.type })
        return
      }
    }
    const guard = emailGuards.get(payload.type)
    if (guard && !(await guard(payload))) return
    const templateId = templateIdFor(payload.type)
    if (!templateId) throw new Error(`Unknown email type ${payload.type}`)
    await deliverEmail({
      templateId,
      type: payload.type,
      to: payload.to,
      variables: payload.variables,
      replyTo: payload.replyTo,
    })
  },
  'newsletter.subscribe': async ({ userId }) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, isNewsletterOptedIn: true } })
    if (user?.isNewsletterOptedIn) await subscribeToNewsletter(user.email, user.firstName)
  },
  'newsletter.unsubscribe': async ({ userId }) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user) await unsubscribeFromNewsletter(user.email)
  },
}

/** Registers a handler from another module (files, exports), so this file does not import everything. */
export function registerHandler<T extends OutboxType>(type: T, handler: Handler<T>): void {
  ;(handlers as Record<string, Handler<OutboxType>>)[type] = handler as unknown as Handler<OutboxType>
}

export async function runHandler(type: string, payload: unknown): Promise<void> {
  if (!(type in outboxPayloads)) throw new Error(`Unknown outbox type ${type}`)
  const key = type as OutboxType
  const parsed = outboxPayloads[key].parse(payload)
  const handler = (handlers as Record<string, Handler<OutboxType>>)[key]
  if (!handler) throw new Error(`No handler for ${type}`)
  await handler(parsed as never)
}
