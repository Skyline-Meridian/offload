import 'server-only'

import type Stripe from 'stripe'

import type { EndedReason, Prisma, SubscriptionStatus } from '@/generated/prisma/client'
import { routes } from '@/lib/routes'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { getStripe, idOf, paymentIntentForInvoice } from '@/server/integrations/stripe'
import { errorInfo, log } from '@/server/log'
import { notifyManagers, notifyStaff } from '@/server/services/billing/notify'

/** Stripe status to ours (06 design section 3). `incomplete` is never stored. */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus | null {
  switch (status) {
    case 'trialing':
      return 'TRIALING'
    case 'active':
      return 'ACTIVE'
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE'
    case 'paused':
      return 'PAUSED'
    case 'canceled':
    case 'incomplete_expired':
      return 'ENDED'
    default:
      return null
  }
}

const fromUnix = (seconds: number | null | undefined): Date | null => (typeof seconds === 'number' ? new Date(seconds * 1000) : null)

/** In current API versions the period dates are on the subscription item. */
export function periodOf(subscription: Stripe.Subscription): { start: Date | null; end: Date | null } {
  const item = subscription.items.data[0]
  return { start: fromUnix(item?.current_period_start), end: fromUnix(item?.current_period_end) }
}

export class DuplicatePurchaseError extends Error {
  constructor(
    readonly stripeSubscriptionId: string,
    readonly organisationId: string,
  ) {
    super('The organisation already has a paid subscription')
    this.name = 'DuplicatePurchaseError'
  }
}

export async function lockBilling(tx: Tx, organisationId: string): Promise<void> {
  await tx.$queryRaw`SELECT "organisationId" FROM "BillingAccount" WHERE "organisationId" = ${organisationId}::uuid FOR UPDATE`
}

type Applied = { subscriptionId: string; created: boolean }

/**
 * Writes Stripe's current view of a subscription over the local row. Never an increment, so repeated and
 * out-of-order events give the same result. Emails go out only for real changes (06 design section 9.1).
 */
export async function applyStripeSubscription(subscription: Stripe.Subscription): Promise<Applied | null> {
  const customerId = idOf(subscription.customer)
  const organisationId =
    subscription.metadata.organisationId ??
    (customerId ? (await db.billingAccount.findUnique({ where: { stripeCustomerId: customerId }, select: { organisationId: true } }))?.organisationId : undefined)
  if (!organisationId) throw new Error('Subscription has no organisation')

  const priceId = subscription.items.data[0]?.price.id
  const planPrice = priceId ? await db.planPrice.findUnique({ where: { stripePriceId: priceId }, include: { plan: true } }) : null
  if (!planPrice) throw new Error('Subscription uses a price that is not a known plan price')

  const mapped = mapStripeStatus(subscription.status)
  if (!mapped) return null

  return db.$transaction(async (tx) => {
    await lockBilling(tx, organisationId)
    const existing = await tx.subscription.findUnique({ where: { stripeSubscriptionId: subscription.id } })

    if (!existing) {
      // A cancelled duplicate or an old ended subscription we never stored: nothing to keep.
      if (mapped === 'ENDED') return null
      const other = await tx.subscription.findFirst({ where: { organisationId, kind: 'PAID', status: { not: 'ENDED' } }, select: { id: true } })
      if (other) throw new DuplicatePurchaseError(subscription.id, organisationId)
    }

    const status: SubscriptionStatus = subscription.pause_collection && mapped !== 'ENDED' ? 'PAUSED' : mapped
    const { start, end } = periodOf(subscription)
    const now = new Date()

    // Discount: the promotion code used, found by its Stripe id.
    let discountCodeId: string | null = existing?.discountCodeId ?? null
    const discount = subscription.discounts.find((d): d is Stripe.Discount => typeof d !== 'string')
    if (discount) {
      const promotionId = idOf(discount.promotion_code)
      const code = promotionId ? await tx.discountCode.findUnique({ where: { stripePromotionCodeId: promotionId }, select: { id: true } }) : null
      discountCodeId = code?.id ?? discountCodeId
    } else if (subscription.discounts.length === 0) {
      discountCodeId = null
    }

    const scheduleId = idOf(subscription.schedule)
    let scheduledPlanId = scheduleId ? (existing?.scheduledPlanId ?? null) : null
    if (scheduledPlanId === planPrice.planId) scheduledPlanId = null

    const wasPastDue = existing?.status === 'PAST_DUE'
    const pastDueSince = status === 'PAST_DUE' ? (wasPastDue ? existing!.pastDueSince : now) : null

    let endedReason: EndedReason | null = existing?.endedReason ?? null
    let accessEndedAt = existing?.accessEndedAt ?? null
    if (status === 'ENDED') {
      endedReason ??= subscription.cancellation_details?.reason === 'payment_failed' ? 'NON_PAYMENT' : 'CANCELLED'
      accessEndedAt ??= fromUnix(subscription.ended_at) ?? now
    } else if (wasPastDue) {
      // Paid up again: access returns.
      accessEndedAt = null
      endedReason = null
    }

    const data: Prisma.SubscriptionUncheckedUpdateInput = {
      status,
      planId: planPrice.planId,
      planPriceId: planPrice.id,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      isCancelledAtPeriodEnd: subscription.cancel_at_period_end || (subscription.cancel_at !== null && status !== 'ENDED'),
      scheduledPlanId,
      stripeScheduleId: scheduleId,
      discountCodeId,
      pastDueSince,
      endedReason,
      accessEndedAt,
      // A paused subscription keeps what the pause service stored; anything else clears it.
      ...(status === 'PAUSED' ? {} : { pausedAt: null, pausedRemainingSeconds: null }),
    }

    let row
    if (existing) {
      row = await tx.subscription.update({ where: { id: existing.id }, data })
    } else {
      row = await tx.subscription.create({
        data: {
          organisationId,
          kind: 'PAID',
          status,
          planId: planPrice.planId,
          planPriceId: planPrice.id,
          stripeSubscriptionId: subscription.id,
          purchasedById: /^[0-9a-f-]{36}$/i.test(subscription.metadata.purchasedById ?? '') ? subscription.metadata.purchasedById : null,
          startedAt: fromUnix(subscription.start_date) ?? now,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          isCancelledAtPeriodEnd: Boolean(data.isCancelledAtPeriodEnd),
          scheduledPlanId,
          stripeScheduleId: scheduleId,
          discountCodeId,
          pastDueSince,
        },
      })
    }

    if (discountCodeId) {
      const used = await tx.subscription.count({ where: { discountCodeId } })
      await tx.discountCode.update({ where: { id: discountCodeId }, data: { timesRedeemed: used } })
    }

    // ─── Emails only for real changes ───
    const info = { planName: planPrice.plan.name, date: end, link: routes.subscription }
    if (!existing) {
      await notifyManagers(tx, organisationId, 'billing.subscription-started', { ...info, amountPence: planPrice.amountPence, notificationType: 'billing.started' })
      await audit(tx, { action: 'billing.subscription.started', subjectType: 'Subscription', subjectId: row.id, relatedOrgId: organisationId })
    } else {
      if (existing.status !== 'PAST_DUE' && status === 'PAST_DUE') {
        await notifyManagers(tx, organisationId, 'billing.payment-failed', { ...info, notificationType: 'billing.payment-failed' })
        await notifyStaff(tx, organisationId, 'billing.staff-payment-failed', { ...info })
      }
      if (wasPastDue && (status === 'ACTIVE' || status === 'TRIALING')) {
        await notifyManagers(tx, organisationId, 'billing.payment-recovered', { ...info, notificationType: 'billing.payment-recovered' })
      }
      if (!existing.isCancelledAtPeriodEnd && row.isCancelledAtPeriodEnd && status !== 'ENDED') {
        await notifyManagers(tx, organisationId, 'billing.cancelled', { ...info, notificationType: 'billing.cancelled' })
      }
      if (existing.status !== 'ENDED' && status === 'ENDED') {
        await notifyManagers(tx, organisationId, 'billing.ended', { ...info, date: accessEndedAt, notificationType: 'billing.ended' })
      }
      if (existing.planPriceId && existing.planPriceId !== planPrice.id) {
        await notifyManagers(tx, organisationId, 'billing.plan-changed', { ...info, amountPence: planPrice.amountPence, notificationType: 'billing.plan-changed' })
      }
    }
    return { subscriptionId: row.id, created: !existing }
  })
}

/** Fetches the subscription from Stripe and applies it. A double purchase is cancelled and refunded. */
export async function syncSubscription(stripeSubscriptionId: string): Promise<Applied | null> {
  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId, { expand: ['discounts'] })
  return applyOrHandleDuplicate(subscription)
}

export async function applyOrHandleDuplicate(subscription: Stripe.Subscription): Promise<Applied | null> {
  try {
    return await applyStripeSubscription(subscription)
  } catch (error) {
    if (error instanceof DuplicatePurchaseError) {
      await handleDuplicatePurchase(subscription, error.organisationId)
      return null
    }
    throw error
  }
}

/** SUB-4.5: the second subscription is cancelled at once, its first payment refunded in full, and staff told. */
async function handleDuplicatePurchase(subscription: Stripe.Subscription, organisationId: string): Promise<void> {
  const stripe = getStripe()
  if (subscription.status !== 'canceled') {
    await stripe.subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false }, { idempotencyKey: `dup-cancel:${subscription.id}` })
  }
  const invoiceId = idOf(subscription.latest_invoice)
  if (invoiceId) {
    try {
      const paymentIntent = await paymentIntentForInvoice(invoiceId)
      if (paymentIntent) await stripe.refunds.create({ payment_intent: paymentIntent, reason: 'duplicate' }, { idempotencyKey: `dup-refund:${subscription.id}` })
    } catch (error) {
      log.error('duplicate purchase refund failed', errorInfo(error))
    }
  }
  await db.$transaction((tx) => notifyStaff(tx, organisationId, 'billing.staff-refund', { link: '/dashboard/staff/billing/subscriptions', notificationType: 'billing.duplicate-purchase' }))
  log.warn('duplicate purchase cancelled and refunded', { organisationId })
}

// ─── Invoices ───────────────────────────────────────────────────────────

export function mapInvoiceStatus(invoice: Pick<Stripe.Invoice, 'status' | 'attempt_count'>): 'PAID' | 'FAILED' | 'OPEN' | 'VOID' {
  if (invoice.status === 'paid') return 'PAID'
  if (invoice.status === 'void' || invoice.status === 'uncollectible') return 'VOID'
  return invoice.attempt_count > 0 ? 'FAILED' : 'OPEN'
}

export function subscriptionIdOfInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details
  return details ? idOf(details.subscription) : null
}

async function lastFailureMessage(invoiceId: string): Promise<string | null> {
  try {
    const payments = await getStripe().invoicePayments.list({ invoice: invoiceId, expand: ['data.payment.payment_intent'], limit: 5 })
    for (const p of payments.data) {
      if (p.payment.type !== 'payment_intent') continue
      const intent = p.payment.payment_intent
      if (typeof intent !== 'string' && intent?.last_payment_error?.message) return intent.last_payment_error.message.slice(0, 300)
    }
  } catch (error) {
    log.warn('could not read the failure reason', errorInfo(error))
  }
  return null
}

/** Stores one invoice as a Payment. Returns true when it just became paid. */
export async function applyStripeInvoice(invoice: Stripe.Invoice, failureMessage: string | null): Promise<{ becamePaid: boolean } | null> {
  const stripeSubscriptionId = subscriptionIdOfInvoice(invoice)
  if (!stripeSubscriptionId) return null
  const local = await db.subscription.findUnique({ where: { stripeSubscriptionId }, select: { id: true, organisationId: true, plan: { select: { name: true } } } })
  if (!local) return null

  const status = mapInvoiceStatus(invoice)
  const line = invoice.lines.data[0]
  const periodStart = fromUnix(line?.period.start ?? invoice.period_start) ?? new Date()
  const periodEnd = fromUnix(line?.period.end ?? invoice.period_end) ?? periodStart
  const discountPence = (invoice.total_discount_amounts ?? []).reduce((sum, d) => sum + d.amount, 0)

  return db.$transaction(async (tx) => {
    await lockBilling(tx, local.organisationId)
    const before = await tx.payment.findUnique({ where: { stripeInvoiceId: invoice.id }, select: { status: true } })
    const fields = {
      status,
      invoiceNumber: invoice.number,
      amountPence: status === 'PAID' ? invoice.amount_paid : invoice.amount_due,
      discountPence,
      failedAttempts: status === 'PAID' ? (before ? undefined : 0) : invoice.attempt_count,
      lastFailureMessage: status === 'FAILED' ? failureMessage : status === 'PAID' ? null : undefined,
      periodStart,
      periodEnd,
      paidAt: fromUnix(invoice.status_transitions.paid_at),
    }
    await tx.payment.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        organisationId: local.organisationId,
        subscriptionId: local.id,
        stripeInvoiceId: invoice.id,
        ...fields,
        failedAttempts: fields.failedAttempts ?? 0,
      },
      update: fields,
    })
    const becamePaid = status === 'PAID' && before?.status !== 'PAID'
    if (becamePaid && invoice.amount_paid > 0) {
      const payment = await tx.payment.findUniqueOrThrow({ where: { stripeInvoiceId: invoice.id }, select: { id: true } })
      await notifyManagers(tx, local.organisationId, 'billing.receipt', {
        planName: local.plan.name,
        amountPence: invoice.amount_paid,
        date: fromUnix(invoice.status_transitions.paid_at),
        link: `/billing/invoices/${payment.id}`,
        notificationType: 'billing.receipt',
      })
    }
    return { becamePaid }
  })
}

export async function syncInvoice(invoiceId: string): Promise<{ becamePaid: boolean } | null> {
  const invoice = await getStripe().invoices.retrieve(invoiceId)
  const stripeSubscriptionId = subscriptionIdOfInvoice(invoice)
  if (stripeSubscriptionId && !(await db.subscription.findUnique({ where: { stripeSubscriptionId }, select: { id: true } }))) {
    // The invoice arrived before its subscription: bring the subscription in first.
    await syncSubscription(stripeSubscriptionId)
  }
  const failure = mapInvoiceStatus(invoice) === 'FAILED' ? await lastFailureMessage(invoiceId) : null
  return applyStripeInvoice(invoice, failure)
}

// ─── Customer ───────────────────────────────────────────────────────────

export async function syncCustomer(customerId: string): Promise<void> {
  const account = await db.billingAccount.findUnique({ where: { stripeCustomerId: customerId }, select: { organisationId: true } })
  if (!account) return
  const customer = await getStripe().customers.retrieve(customerId, { expand: ['invoice_settings.default_payment_method'] })
  if (customer.deleted) return
  const method = customer.invoice_settings.default_payment_method
  const card = typeof method !== 'string' && method?.type === 'card' ? method.card : null
  await db.billingAccount.update({
    where: { organisationId: account.organisationId },
    data: {
      billingName: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address
        ? { line1: customer.address.line1, line2: customer.address.line2, city: customer.address.city, postcode: customer.address.postal_code, country: customer.address.country }
        : undefined,
      ...(card ? { cardBrand: card.brand, cardLast4: card.last4 } : {}),
    },
  })
}
