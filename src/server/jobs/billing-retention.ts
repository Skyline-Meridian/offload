import 'server-only'

import { db } from '@/server/db'
import { getStripe, isStripeConfigured } from '@/server/integrations/stripe'
import { errorInfo, log } from '@/server/log'

const SIX_YEARS = 6 * 365 * 86_400_000

/** Each 1 January: billing records whose last payment is over 6 years old are deleted, then the Stripe customer (SUB-10). */
export async function billingRetention(): Promise<Record<string, number>> {
  const cutoff = new Date(Date.now() - SIX_YEARS)
  const accounts = await db.billingAccount.findMany({ select: { organisationId: true, stripeCustomerId: true, createdAt: true } })
  let deleted = 0
  for (const account of accounts) {
    const live = await db.subscription.count({ where: { organisationId: account.organisationId, status: { not: 'ENDED' } } })
    if (live > 0) continue
    const last = await db.payment.aggregate({ where: { organisationId: account.organisationId }, _max: { createdAt: true } })
    if ((last._max.createdAt ?? account.createdAt) > cutoff) continue
    try {
      if (isStripeConfigured()) await getStripe().customers.del(account.stripeCustomerId).catch(() => undefined)
      await db.$transaction(async (tx) => {
        const subs = await tx.subscription.findMany({ where: { organisationId: account.organisationId }, select: { id: true } })
        const ids = subs.map((s) => s.id)
        await tx.refund.deleteMany({ where: { payment: { organisationId: account.organisationId } } })
        await tx.payment.deleteMany({ where: { organisationId: account.organisationId } })
        await tx.billingReminder.deleteMany({ where: { subscriptionId: { in: ids } } })
        await tx.subscription.deleteMany({ where: { organisationId: account.organisationId } })
        await tx.billingAccount.delete({ where: { organisationId: account.organisationId } })
      })
      deleted += 1
    } catch (error) {
      log.error('billing retention failed for one organisation', errorInfo(error))
    }
  }
  return { deleted }
}
