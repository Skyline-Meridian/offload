import 'server-only'

import type { Tx } from '@/server/db'
import { emailTypes, emailVariableNames, type EmailType, type EmailVariables } from '@/server/email/types'
import { enqueue } from '@/server/outbox'

type SendEmailInput<T extends EmailType> = {
  type: T
  to: string
  variables: EmailVariables<T>
  replyTo?: string
  userId?: string
  context?: Record<string, string>
}

/** Queues one email. Checks that the variables match the type exactly, so a template never gets a missing value. */
export async function sendEmail<T extends EmailType>(tx: Tx, input: SendEmailInput<T>): Promise<void> {
  const expected = [...emailVariableNames(input.type)].sort()
  const given = Object.keys(input.variables).sort()
  if (expected.length !== given.length || expected.some((name, i) => name !== given[i])) {
    throw new Error(`Email ${input.type} needs exactly these variables: ${expected.join(', ')}`)
  }
  await enqueue(tx, 'email.send', {
    type: input.type,
    to: input.to,
    variables: input.variables as Record<string, string>,
    replyTo: input.replyTo,
    userId: input.userId,
    context: input.context,
  })
}

export function templateIdFor(type: string): string | null {
  return type in emailTypes ? emailTypes[type as EmailType].templateId : null
}
