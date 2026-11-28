import 'server-only'

import { env } from '@/server/env'
import { log } from '@/server/log'
import { getSetting } from '@/server/settings'

export type OutgoingEmail = {
  templateId: string
  type: string
  to: string
  variables: Record<string, string>
  replyTo?: string
}

/** Applies OUTBOUND_MODE: in redirect mode every email goes to one safe address (01 section 9.4). */
export function applyOutboundMode(mail: OutgoingEmail): OutgoingEmail & { subjectPrefix?: string } {
  if (env.OUTBOUND_MODE === 'live') return mail
  if (!env.OUTBOUND_REDIRECT_EMAIL) throw new Error('OUTBOUND_REDIRECT_EMAIL is not set')
  return {
    ...mail,
    to: env.OUTBOUND_REDIRECT_EMAIL,
    variables: { ...mail.variables, originalRecipient: mail.to },
    subjectPrefix: `[to ${mail.to}] `,
  }
}

async function sendWithSmtp2go(mail: OutgoingEmail & { subjectPrefix?: string }): Promise<void> {
  if (!env.SMTP2GO_API_KEY) throw new Error('SMTP2GO_API_KEY is not set')
  const fromAddress = (await getSetting<string>('email.fromAddress')) || env.EMAIL_FROM_ADDRESS
  const fromName = (await getSetting<string>('email.fromName')) || env.EMAIL_FROM_NAME
  if (!fromAddress) throw new Error('No sender address is configured')

  const response = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Smtp2go-Api-Key': env.SMTP2GO_API_KEY },
    body: JSON.stringify({
      sender: `${fromName} <${fromAddress}>`,
      to: [mail.to],
      template_id: mail.templateId,
      template_data: mail.variables,
      custom_headers: mail.replyTo ? [{ header: 'Reply-To', value: mail.replyTo }] : undefined,
    }),
  })
  if (!response.ok) throw new Error(`SMTP2GO responded with status ${response.status}`)
}

/** Sends one email with the configured driver. Throws on failure so the outbox retries. */
export async function deliverEmail(mail: OutgoingEmail): Promise<void> {
  const outgoing = applyOutboundMode(mail)
  if (env.EMAIL_DRIVER === 'smtp2go') {
    await sendWithSmtp2go(outgoing)
    return
  }
  // Links hold tokens, so they are written only outside production, so you can click them while developing.
  log.info('email (log driver)', {
    emailType: outgoing.type,
    variableNames: Object.keys(outgoing.variables),
    link: env.NODE_ENV === 'production' ? undefined : outgoing.variables.link,
  })
}
