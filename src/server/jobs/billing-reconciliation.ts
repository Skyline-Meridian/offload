import 'server-only'

import { db } from '@/server/db'
import { isStripeConfigured, getStripe } from '@/server/integrations/stripe'
import { errorInfo, log } from '@/server/log'
import { notify, staffUserIds } from '@/server/notify'
import { applyOrHandleDuplicate, syncSubscription } from '@/server/services/billing/sync'
import { handleStripeEvent } from '@/server/services/billing/webhook'

/** Daily at 04:00: bring the local copy in line with Stripe, retry failed events, report differences (06 design section 9.3). */
export async function billingReconciliation(): Promise<Record<string, number | string>> {
  if (!isStripeConfigured()) return { skipped: 'Stripe is not configured' }
  const stripe = getStripe()
  const changed: string[] = []
  let checked = 0

  const track = async (stripeId: string, run: () => Promise<unknown>): Promise<void> => {
    const before = await db.subscription.findUnique({ where: { stripeSubscriptionId: stripeId }, select: { id: true, status: true } })
    await run()
    const after = await db.subscription.findUnique({ where: { stripeSubscriptionId: stripeId }, select: { status: true } })
    if (before && after && before.status !== after.status) changed.push(`${before.id}: ${before.status} to ${after.status}`)
    checked += 1
  }

  // Every local paid subscription that is not ended
  const local = await db.subscription.findMany({ where: { kind: 'PAID', status: { not: 'ENDED' }, stripeSubscriptionId: { not: null } }, select: { stripeSubscriptionId: true, status: true } })
  for (const sub of local) {
    try {
      await track(sub.stripeSubscriptionId!, () => syncSubscription(sub.stripeSubscriptionId!))
      if (sub.status === 'PAUSED') {
        const live = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId!)
        if (!live.pause_collection) changed.push(`${sub.stripeSubscriptionId}: paused locally but not in Stripe`)
      }
    } catch (error) {
      log.error('reconciliation failed for one subscription', errorInfo(error))
    }
  }

  // Anything Stripe changed in the last 2 days, including subscriptions we never stored
  const since = Math.floor((Date.now() - 2 * 86_400_000) / 1000)
  for await (const subscription of stripe.subscriptions.list({ status: 'all', created: { gte: since }, limit: 100, expand: ['data.discounts'] })) {
    try {
      await track(subscription.id, () => applyOrHandleDuplicate(subscription))
    } catch (error) {
      log.error('reconciliation failed for a new subscription', errorInfo(error))
    }
  }

  // Events that failed before
  const failed = await db.webhookEvent.findMany({ where: { processedAt: null, error: { not: null } }, take: 50, select: { id: true } })
  let retried = 0
  for (const row of failed) {
    try {
      const event = await stripe.events.retrieve(row.id)
      if ((await handleStripeEvent(event)) === 200) retried += 1
    } catch (error) {
      log.error('retrying a failed event did not work', errorInfo(error))
    }
  }

  if (changed.length > 0 || failed.length > retried) {
    log.warn('billing reconciliation found differences', { changes: changed.length, unresolvedEvents: failed.length - retried })
    await db.$transaction(async (tx) => {
      await notify(tx, { userIds: await staffUserIds(tx), type: 'billing.reconciliation', linkPath: '/dashboard/staff/billing/subscriptions', subjectName: `${changed.length} changes` })
    })
  }
  return { checked, changed: changed.length, retriedEvents: retried }
}
