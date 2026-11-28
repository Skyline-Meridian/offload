import 'server-only'

import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import type { Viewer } from '@/server/dal/viewer'
import { db, type Tx } from '@/server/db'
import { getStripe, paymentIntentForInvoice } from '@/server/integrations/stripe'
import { notifyManagers } from '@/server/services/billing/notify'
import { requireBillingPermission } from '@/server/services/billing/permissions'
import { lockBilling, syncSubscription } from '@/server/services/billing/sync'
import { schedulePlanSwitch } from '@/server/services/billing/lifecycle'

const unix = (date: Date): number => Math.floor(date.getTime() / 1000)

async function load(tx: Tx, subscriptionId: string) {
  const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } })
  if (!sub) throw new DomainError('not-found', 'Subscription not found.')
  return sub
}

// ─── Trials (local only, no Stripe object) ──────────────────────────────

export async function giveTrial(staff: Viewer, input: { organisationId: string; planId: string; endsAt: Date }): Promise<string> {
  requireBillingPermission(staff, 'billing.manage')
  if (input.endsAt <= new Date()) throw new DomainError('bad-date', 'The trial must end in the future.')
  return db.$transaction(async (tx) => {
    const org = await tx.organisation.findFirst({ where: { id: input.organisationId, deletedAt: null }, select: { status: true, type: true } })
    if (!org || org.status !== 'PUBLISHED') throw new DomainError('not-published', 'The organisation must be published to have a trial.')
    const plan = await tx.plan.findUnique({ where: { id: input.planId } })
    if (!plan || plan.organisationType !== org.type) throw new DomainError('bad-plan', 'Choose a plan for this type of organisation.')
    const running = await tx.subscription.findFirst({
      where: { organisationId: input.organisationId, status: { not: 'ENDED' }, OR: [{ kind: 'TRIAL' }, { kind: 'PAID' }] },
      select: { kind: true },
    })
    if (running) throw new DomainError('has-subscription', running.kind === 'TRIAL' ? 'This organisation already has a running trial.' : 'This organisation already has a paid subscription.')
    const row = await tx.subscription.create({
      data: { organisationId: input.organisationId, kind: 'TRIAL', status: 'TRIALING', planId: plan.id, purchasedById: staff.user.id, startedAt: new Date(), currentPeriodStart: new Date(), currentPeriodEnd: input.endsAt },
    })
    await audit(tx, { action: 'billing.trial.give', subjectType: 'Subscription', subjectId: row.id, relatedOrgId: input.organisationId, data: { endsAt: input.endsAt, planId: plan.id } })
    await notifyManagers(tx, input.organisationId, 'billing.trial-started', { planName: plan.name, date: input.endsAt, notificationType: 'billing.trial-started' })
    return row.id
  })
}

export async function extendTrial(staff: Viewer, subscriptionId: string, endsAt: Date): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  await db.$transaction(async (tx) => {
    const sub = await load(tx, subscriptionId)
    if (sub.kind !== 'TRIAL' || sub.status === 'ENDED') throw new DomainError('bad-state', 'This is not a running trial.')
    if (endsAt <= new Date()) throw new DomainError('bad-date', 'The new end date must be in the future.')
    await tx.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: endsAt, status: sub.status === 'PAUSED' ? 'PAUSED' : 'TRIALING', accessEndedAt: null, endedReason: null } })
    await audit(tx, { action: 'billing.trial.extend', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId, data: { endsAt } })
  })
}

export async function cancelTrial(staff: Viewer, subscriptionId: string): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  await db.$transaction(async (tx) => {
    const sub = await load(tx, subscriptionId)
    if (sub.kind !== 'TRIAL' || sub.status === 'ENDED') throw new DomainError('bad-state', 'This is not a running trial.')
    await tx.subscription.update({ where: { id: sub.id }, data: { status: 'ENDED', endedReason: 'STAFF', accessEndedAt: new Date() } })
    await audit(tx, { action: 'billing.trial.cancel', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId })
  })
}

// ─── Paid subscriptions ─────────────────────────────────────────────────

function paid(sub: Awaited<ReturnType<typeof load>>) {
  if (sub.kind !== 'PAID' || !sub.stripeSubscriptionId || sub.status === 'ENDED') throw new DomainError('bad-state', 'This is not a running paid subscription.')
  return sub.stripeSubscriptionId
}

export async function cancelAtPeriodEndByStaff(staff: Viewer, subscriptionId: string): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  await db.$transaction(async (tx) => {
    const sub = await load(tx, subscriptionId)
    const stripeId = paid(sub)
    await lockBilling(tx, sub.organisationId)
    if (sub.stripeScheduleId) await getStripe().subscriptionSchedules.release(sub.stripeScheduleId).catch(() => undefined)
    await getStripe().subscriptions.update(stripeId, { cancel_at_period_end: true }, { idempotencyKey: `staff-cancel:${sub.id}:${sub.currentPeriodEnd?.getTime()}` })
    await tx.subscription.update({ where: { id: sub.id }, data: { isCancelledAtPeriodEnd: true, scheduledPlanId: null, stripeScheduleId: null } })
    await audit(tx, { action: 'billing.subscription.cancel-at-end', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId })
  })
}

/** Ends the subscription now. No proration and no automatic refund (SUB-8.2). */
export async function cancelNow(staff: Viewer, subscriptionId: string): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  await db.$transaction(async (tx) => {
    const sub = await load(tx, subscriptionId)
    if (sub.status === 'ENDED') return
    if (sub.kind === 'PAID' && sub.stripeSubscriptionId) {
      await lockBilling(tx, sub.organisationId)
      await getStripe().subscriptions.cancel(sub.stripeSubscriptionId, { prorate: false, invoice_now: false }, { idempotencyKey: `staff-cancel-now:${sub.id}` })
    }
    await tx.subscription.update({ where: { id: sub.id }, data: { status: 'ENDED', endedReason: 'STAFF', accessEndedAt: new Date(), isCancelledAtPeriodEnd: false, stripeScheduleId: null, scheduledPlanId: null } })
    await audit(tx, { action: 'billing.subscription.cancel-now', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId })
    await notifyManagers(tx, sub.organisationId, 'billing.ended', { planName: sub.plan.name, date: new Date(), notificationType: 'billing.ended' })
  })
}

/** The time added is free: the next payment moves to the new date. */
export async function extendPeriod(staff: Viewer, subscriptionId: string, newEnd: Date): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new DomainError('not-found', 'Subscription not found.')
  const stripeId = paid(sub as Awaited<ReturnType<typeof load>>)
  if (newEnd <= new Date()) throw new DomainError('bad-date', 'The new date must be in the future.')
  await db.$transaction(async (tx) => {
    await lockBilling(tx, sub.organisationId)
    await getStripe().subscriptions.update(stripeId, { trial_end: unix(newEnd), proration_behavior: 'none' }, { idempotencyKey: `extend:${sub.id}:${newEnd.getTime()}` })
    await tx.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: newEnd } })
    await audit(tx, { action: 'billing.subscription.extend', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId, data: { newEnd } })
  })
  await syncSubscription(stripeId)
}

/** Same billing period: the price changes from the next renewal. Other period: a schedule (SUB-6.7). */
export async function changePlan(staff: Viewer, subscriptionId: string, targetPlanId: string): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } })
  if (!sub) throw new DomainError('not-found', 'Subscription not found.')
  const stripeId = paid(sub)
  const target = await db.plan.findUnique({ where: { id: targetPlanId }, include: { prices: true } })
  if (!target || !target.isActive || target.organisationType !== sub.plan.organisationType) throw new DomainError('bad-plan', 'Choose an active plan for this type of organisation.')
  if (target.id === sub.planId) return

  if (target.interval !== sub.plan.interval) {
    await schedulePlanSwitch(staff.user.id, sub.organisationId, target.id)
    return
  }
  const price = target.prices.find((p) => p.id === target.currentPriceId)
  if (!price) throw new DomainError('bad-plan', 'This plan is not available.')
  const stripe = getStripe()
  const current = await stripe.subscriptions.retrieve(stripeId)
  const item = current.items.data[0]
  if (!item) throw new DomainError('bad-state', 'The subscription has no items.')
  await db.$transaction(async (tx) => {
    await lockBilling(tx, sub.organisationId)
    await stripe.subscriptions.update(stripeId, { items: [{ id: item.id, price: price.stripePriceId }], proration_behavior: 'none' }, { idempotencyKey: `staff-change:${sub.id}:${target.id}:${Math.floor(Date.now() / 60000)}` })
    await audit(tx, { action: 'billing.subscription.change-plan', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId, data: { toPlan: target.id } })
  })
  await syncSubscription(stripeId)
}

// ─── Refunds ────────────────────────────────────────────────────────────

/** Refund up to what is left on a payment (SUB-8.3). The money goes back to the original payment method. */
export async function refundPayment(staff: Viewer, paymentId: string, amountPence: number, reason: string): Promise<{ fullyRefunded: boolean }> {
  requireBillingPermission(staff, 'billing.manage')
  const trimmed = reason.trim()
  if (!trimmed) throw new DomainError('reason', 'Give a reason for the refund.')
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { subscription: { include: { plan: true } } } })
  if (!payment?.stripeInvoiceId) throw new DomainError('not-found', 'This payment cannot be refunded here.')
  if (payment.status !== 'PAID') throw new DomainError('bad-state', 'Only a paid invoice can be refunded.')
  const left = payment.amountPence - payment.amountRefundedPence
  if (!Number.isInteger(amountPence) || amountPence < 1 || amountPence > left) throw new DomainError('amount', `Enter an amount between £0.01 and what is left to refund.`)
  const intent = await paymentIntentForInvoice(payment.stripeInvoiceId)
  if (!intent) throw new DomainError('not-found', 'No card payment was found for this invoice.')

  const refund = await getStripe().refunds.create(
    { payment_intent: intent, amount: amountPence, metadata: { reason: trimmed.slice(0, 200), paymentId } },
    { idempotencyKey: `refund:${paymentId}:${amountPence}:${payment.amountRefundedPence}` },
  )
  await db.$transaction(async (tx) => {
    await lockBilling(tx, payment.organisationId)
    await tx.refund.upsert({
      where: { stripeRefundId: refund.id },
      create: { paymentId, stripeRefundId: refund.id, amountPence, reason: trimmed },
      update: {},
    })
    const total = await tx.refund.aggregate({ where: { paymentId }, _sum: { amountPence: true } })
    await tx.payment.update({ where: { id: paymentId }, data: { amountRefundedPence: total._sum.amountPence ?? 0 } })
    await audit(tx, { action: 'billing.refund', subjectType: 'Payment', subjectId: paymentId, relatedOrgId: payment.organisationId, data: { amountPence, reason: trimmed } })
    await notifyManagers(tx, payment.organisationId, 'billing.refund', { planName: payment.subscription.plan.name, amountPence, notificationType: 'billing.refund' })
  })
  return { fullyRefunded: amountPence === left && payment.amountRefundedPence + amountPence >= payment.amountPence }
}
