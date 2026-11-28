import 'server-only'

import { formatDate } from '@/lib/format/date'
import { formatMoney } from '@/lib/format/money'
import { routes } from '@/lib/routes'
import type { Tx } from '@/server/db'
import { sendEmail } from '@/server/email/send'
import type { EmailType } from '@/server/email/types'
import { env } from '@/server/env'
import { notify, staffUserIds } from '@/server/notify'
import { managersToNotify } from '@/server/services/organisations/members'

export type BillingEmailType = Extract<EmailType, `billing.${string}`>

export type BillingInfo = {
  planName?: string
  /** Pence. Shown as £35.00. */
  amountPence?: number
  date?: Date | null
  /** A path on this site (for example the subscription page) or a full address. */
  link?: string
  /** In-app notification type. Leave out to send the email only. */
  notificationType?: string
}

function absolute(link: string | undefined): string {
  if (!link) return `${env.APP_URL}${routes.subscription}`
  return link.startsWith('http') ? link : `${env.APP_URL}${link}`
}

async function send(tx: Tx, userIds: string[], organisationName: string, type: BillingEmailType, info: BillingInfo): Promise<void> {
  if (userIds.length === 0) return
  const users = await tx.user.findMany({ where: { id: { in: userIds }, status: 'ACTIVE' }, select: { id: true, email: true, firstName: true } })
  for (const user of users) {
    await sendEmail(tx, {
      type,
      to: user.email,
      userId: user.id,
      variables: {
        firstName: user.firstName ?? 'there',
        organisationName,
        planName: info.planName ?? '',
        amount: info.amountPence === undefined ? '' : formatMoney(info.amountPence),
        date: info.date ? formatDate(info.date) : '',
        link: absolute(info.link),
      },
    })
  }
  if (info.notificationType) {
    await notify(tx, { userIds: users.map((u) => u.id), type: info.notificationType, linkPath: info.link?.startsWith('/') ? info.link : routes.subscription, subjectName: organisationName })
  }
}

/** Email (and in-app notification) to every verified manager of the organisation (06 design section 10). */
export async function notifyManagers(tx: Tx, organisationId: string, type: BillingEmailType, info: BillingInfo): Promise<void> {
  const organisation = await tx.organisation.findUnique({ where: { id: organisationId }, select: { name: true } })
  await send(tx, await managersToNotify(tx, organisationId), organisation?.name ?? '', type, info)
}

/** Email to every staff member, for failed payments, refunds and double purchases. */
export async function notifyStaff(tx: Tx, organisationId: string, type: BillingEmailType, info: BillingInfo): Promise<void> {
  const organisation = await tx.organisation.findUnique({ where: { id: organisationId }, select: { name: true } })
  await send(tx, await staffUserIds(tx), organisation?.name ?? '', type, { ...info, link: info.link ?? '/dashboard/staff/billing/subscriptions' })
}
