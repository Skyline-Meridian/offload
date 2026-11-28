import 'server-only'

import type Stripe from 'stripe'

import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { getStripe } from '@/server/integrations/stripe'
import { lockBilling, syncSubscription } from '@/server/services/billing/sync'
import { notifyManagers } from '@/server/services/billing/notify'

/** The paid subscription that can be changed (not ended). */
async function currentPaid(tx: Tx, organisationId: string) {
  const subscription = await tx.subscription.findFirst({
    where: { organisationId, kind: 'PAID', status: { not: 'ENDED' } },
    include: { plan: true },
  })
  if (!subscription?.stripeSubscriptionId) throw new DomainError('no-subscription', 'There is no subscription to change.')
  const planPrice = subscription.planPriceId ? await tx.planPrice.findUnique({ where: { id: subscription.planPriceId } }) : null
  return { ...subscription, stripeSubscriptionId: subscription.stripeSubscriptionId, planPrice }
}

const unix = (date: Date): number => Math.floor(date.getTime() / 1000)

async function releaseSchedule(scheduleId: string | null): Promise<void> {
  if (!scheduleId) return
  try {
    await getStripe().subscriptionSchedules.release(scheduleId)
  } catch (error) {
    // A schedule that has already finished or been released is fine.
    if (!(error instanceof Error) || !/released|canceled|completed|No such/i.test(error.message)) throw error
  }
}

// ─── Cancel and undo ────────────────────────────────────────────────────

export async function cancelAtPeriodEnd(userId: string, organisationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockBilling(tx, organisationId)
    const sub = await currentPaid(tx, organisationId)
    if (sub.status === 'PAUSED') throw new DomainError('paused', 'A paused subscription cannot be cancelled. Contact Offload.')
    await releaseSchedule(sub.stripeScheduleId)
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true }, { idempotencyKey: `cancel:${sub.id}:${sub.currentPeriodEnd?.getTime()}` })
    await tx.subscription.update({ where: { id: sub.id }, data: { isCancelledAtPeriodEnd: true, scheduledPlanId: null, stripeScheduleId: null } })
    await audit(tx, { action: 'billing.subscription.cancel', subjectType: 'Subscription', subjectId: sub.id, relatedUserIds: [userId], relatedOrgId: organisationId })
    await notifyManagers(tx, organisationId, 'billing.cancelled', { planName: sub.plan.name, date: sub.currentPeriodEnd, notificationType: 'billing.cancelled' })
  })
}

export async function undoCancel(userId: string, organisationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockBilling(tx, organisationId)
    const sub = await currentPaid(tx, organisationId)
    if (!sub.isCancelledAtPeriodEnd) return
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false }, { idempotencyKey: `undo-cancel:${sub.id}:${Date.now() / 60000 | 0}` })
    await tx.subscription.update({ where: { id: sub.id }, data: { isCancelledAtPeriodEnd: false } })
    await audit(tx, { action: 'billing.subscription.undo-cancel', subjectType: 'Subscription', subjectId: sub.id, relatedUserIds: [userId], relatedOrgId: organisationId })
  })
}

// ─── Plan switch at the end of the period ───────────────────────────────

/** The other billing period's plan for the organisation's type (SUB-6.7). */
export async function otherIntervalPlan(tx: Tx, planId: string) {
  const current = await tx.plan.findUnique({ where: { id: planId } })
  if (!current) return null
  return tx.plan.findFirst({
    where: { organisationType: current.organisationType, interval: current.interval === 'MONTH' ? 'YEAR' : 'MONTH', isActive: true },
    include: { prices: true },
  })
}

/** Builds a two-phase schedule: the current price until the period ends, then the new price. No proration. */
async function createSwitchSchedule(
  stripeSubscriptionId: string,
  currentStripePriceId: string,
  newStripePriceId: string,
  newInterval: 'MONTH' | 'YEAR',
  periodEnd: Date,
): Promise<string> {
  const stripe = getStripe()
  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: stripeSubscriptionId })
  const start = schedule.phases[0]?.start_date
  if (!start) throw new Error('Schedule has no first phase')
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    proration_behavior: 'none',
    phases: [
      { items: [{ price: currentStripePriceId, quantity: 1 }], start_date: start, end_date: unix(periodEnd) },
      // One period at the new price, then the schedule is released and the subscription carries on by itself.
      { items: [{ price: newStripePriceId, quantity: 1 }], duration: { interval: newInterval === 'MONTH' ? 'month' : 'year', interval_count: 1 } },
    ] satisfies Stripe.SubscriptionScheduleUpdateParams.Phase[],
  })
  return schedule.id
}

export async function schedulePlanSwitch(userId: string, organisationId: string, targetPlanId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockBilling(tx, organisationId)
    const sub = await currentPaid(tx, organisationId)
    if (sub.status === 'PAUSED') throw new DomainError('paused', 'A paused subscription cannot be changed.')
    if (!sub.currentPeriodEnd || !sub.planPrice) throw new DomainError('no-subscription', 'There is no subscription to change.')
    const target = await otherIntervalPlan(tx, sub.planId)
    if (!target || target.id !== targetPlanId) throw new DomainError('bad-plan', 'You can only switch between monthly and annual billing.')
    const newPrice = target.prices.find((p) => p.id === target.currentPriceId)
    if (!newPrice) throw new DomainError('bad-plan', 'This plan is not available.')
    await releaseSchedule(sub.stripeScheduleId)
    const scheduleId = await createSwitchSchedule(sub.stripeSubscriptionId, sub.planPrice.stripePriceId, newPrice.stripePriceId, target.interval, sub.currentPeriodEnd)
    await tx.subscription.update({ where: { id: sub.id }, data: { scheduledPlanId: target.id, stripeScheduleId: scheduleId } })
    await audit(tx, { action: 'billing.subscription.switch-plan', subjectType: 'Subscription', subjectId: sub.id, relatedUserIds: [userId], relatedOrgId: organisationId, data: { toPlan: target.id } })
  })
}

export async function cancelPlanSwitch(userId: string, organisationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockBilling(tx, organisationId)
    const sub = await currentPaid(tx, organisationId)
    await releaseSchedule(sub.stripeScheduleId)
    await tx.subscription.update({ where: { id: sub.id }, data: { scheduledPlanId: null, stripeScheduleId: null } })
    await audit(tx, { action: 'billing.subscription.cancel-switch', subjectType: 'Subscription', subjectId: sub.id, relatedUserIds: [userId], relatedOrgId: organisationId })
  })
}

// ─── Pause and resume when an organisation is unpublished or published again ───

/**
 * Called inside the unpublish transaction (03 section 11). The Stripe call runs first: if it fails the whole
 * unpublish fails. A paid or trial subscription that is running is paused; nothing else is touched.
 */
export async function pauseForOrganisation(tx: Tx, organisationId: string): Promise<void> {
  const subscriptions = await tx.subscription.findMany({ where: { organisationId, status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } }, include: { plan: true } })
  const now = new Date()
  for (const sub of subscriptions) {
    if (sub.kind === 'PAID' && sub.stripeSubscriptionId) await lockBilling(tx, organisationId)
    const remaining = sub.status === 'PAST_DUE' || !sub.currentPeriodEnd ? 0 : Math.max(0, Math.floor((sub.currentPeriodEnd.getTime() - now.getTime()) / 1000))
    if (sub.kind === 'PAID' && sub.stripeSubscriptionId) {
      await releaseSchedule(sub.stripeScheduleId)
      await getStripe().subscriptions.update(sub.stripeSubscriptionId, { pause_collection: { behavior: 'void' } }, { idempotencyKey: `pause:${sub.id}:${now.getTime() / 60000 | 0}` })
    }
    await tx.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAUSED', pausedAt: now, pausedRemainingSeconds: remaining, stripeScheduleId: null },
    })
    await audit(tx, { action: 'billing.subscription.pause', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: organisationId, data: { remaining } })
    await notifyManagers(tx, organisationId, 'billing.paused', { planName: sub.plan.name, notificationType: 'billing.paused' })
  }
}

export async function resumeForOrganisation(tx: Tx, organisationId: string): Promise<void> {
  const subscriptions = await tx.subscription.findMany({ where: { organisationId, status: 'PAUSED' }, include: { plan: true } })
  const now = new Date()
  for (const sub of subscriptions) {
    const remaining = sub.pausedRemainingSeconds ?? 0
    const resumedEnd = new Date(now.getTime() + remaining * 1000)
    if (sub.kind === 'TRIAL') {
      await tx.subscription.update({ where: { id: sub.id }, data: { status: 'TRIALING', currentPeriodEnd: resumedEnd, pausedAt: null, pausedRemainingSeconds: null } })
    } else if (sub.stripeSubscriptionId) {
      await lockBilling(tx, organisationId)
      const stripe = getStripe()
      if (remaining > 0) {
        await stripe.subscriptions.update(
          sub.stripeSubscriptionId,
          { trial_end: unix(resumedEnd), proration_behavior: 'none', pause_collection: '' },
          { idempotencyKey: `resume:${sub.id}:${now.getTime() / 60000 | 0}` },
        )
      } else {
        // No free time left: charge at once and start a new period today.
        const params: Stripe.SubscriptionUpdateParams = { billing_cycle_anchor: { type: 'now' }, pause_collection: '' }
        await stripe.subscriptions.update(sub.stripeSubscriptionId, params, { idempotencyKey: `resume:${sub.id}:${now.getTime() / 60000 | 0}` })
      }
      // The status comes from the sync that follows; mark it live meanwhile so access returns at once.
      await tx.subscription.update({ where: { id: sub.id }, data: { status: remaining > 0 ? 'TRIALING' : 'ACTIVE', currentPeriodEnd: resumedEnd, pausedAt: null, pausedRemainingSeconds: null } })
      // Re-create a plan switch that was waiting
      if (sub.scheduledPlanId && sub.planPriceId) {
        const [target, current] = await Promise.all([
          tx.plan.findUnique({ where: { id: sub.scheduledPlanId }, include: { prices: true } }),
          tx.planPrice.findUnique({ where: { id: sub.planPriceId } }),
        ])
        const price = target?.prices.find((p) => p.id === target.currentPriceId)
        if (target && price && current) {
          const scheduleId = await createSwitchSchedule(sub.stripeSubscriptionId, current.stripePriceId, price.stripePriceId, target.interval, resumedEnd)
          await tx.subscription.update({ where: { id: sub.id }, data: { stripeScheduleId: scheduleId } })
        }
      }
    }
    await audit(tx, { action: 'billing.subscription.resume', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: organisationId })
    await notifyManagers(tx, organisationId, 'billing.resumed', { planName: sub.plan.name, date: resumedEnd, notificationType: 'billing.resumed' })
  }
}

/** After a resume commits, bring the local copy in line with Stripe. Failures are left to the daily reconciliation. */
export async function syncAfterResume(organisationId: string): Promise<void> {
  const subs = await db.subscription.findMany({ where: { organisationId, kind: 'PAID', status: { not: 'ENDED' } }, select: { stripeSubscriptionId: true } })
  for (const s of subs) if (s.stripeSubscriptionId) await syncSubscription(s.stripeSubscriptionId).catch(() => undefined)
}
