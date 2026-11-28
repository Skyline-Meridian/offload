import 'server-only'

import type { Subscription } from '@/generated/prisma/client'
import type { OrgTypeKey } from '@/lib/constants'
import type { BillingDetails, PaymentRow, PlanCardData, ShownStatus, SubscriptionPageData } from '@/lib/view-models/billing'
import { db } from '@/server/db'
import { otherIntervalPlan } from '@/server/services/billing/lifecycle'

/** Active plans, for the pricing page. */
export async function listActivePlans(): Promise<PlanCardData[]> {
  const plans = await db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { prices: true } })
  return plans.flatMap((p) => {
    const price = p.prices.find((x) => x.id === p.currentPriceId)
    return price ? [{ id: p.id, name: p.name, organisationType: p.organisationType as OrgTypeKey, interval: p.interval, amountPence: price.amountPence }] : []
  })
}

/** What a person sees as the status (06 design section 3). */
export function shownStatus(s: Pick<Subscription, 'kind' | 'status' | 'isCancelledAtPeriodEnd'>): ShownStatus {
  if (s.status === 'ENDED') return 'Ended'
  if (s.status === 'PAUSED') return 'Paused'
  if (s.status === 'PAST_DUE') return 'Past due'
  if (s.kind === 'TRIAL' || s.status === 'TRIALING') return 'Trial'
  if (s.isCancelledAtPeriodEnd) return 'Cancelled'
  return 'Active'
}

export async function hasPaidSubscription(organisationId: string): Promise<boolean> {
  return (await db.subscription.count({ where: { organisationId, kind: 'PAID', status: { not: 'ENDED' } } })) > 0
}

export async function getSubscriptionPage(organisationId: string): Promise<{
  subscription: SubscriptionPageData | null
  trial: { planName: string; endsAt: Date | null } | null
  details: BillingDetails | null
  payments: PaymentRow[]
}> {
  const [paid, trial, account, payments] = await Promise.all([
    db.subscription.findFirst({ where: { organisationId, kind: 'PAID', status: { not: 'ENDED' } }, include: { plan: true } }),
    db.subscription.findFirst({ where: { organisationId, kind: 'TRIAL', status: { not: 'ENDED' } }, include: { plan: true } }),
    db.billingAccount.findUnique({ where: { organisationId } }),
    db.payment.findMany({ where: { organisationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }),
  ])

  let subscription: SubscriptionPageData | null = null
  if (paid) {
    const [price, scheduled, buyer, other] = await Promise.all([
      paid.planPriceId ? db.planPrice.findUnique({ where: { id: paid.planPriceId }, select: { amountPence: true } }) : null,
      paid.scheduledPlanId ? db.plan.findUnique({ where: { id: paid.scheduledPlanId }, include: { prices: true } }) : null,
      paid.purchasedById ? db.user.findUnique({ where: { id: paid.purchasedById }, select: { firstName: true, lastName: true, status: true } }) : null,
      db.$transaction((tx) => otherIntervalPlan(tx, paid.planId)),
    ])
    const priceOf = (plan: { prices: { id: string; amountPence: number }[]; currentPriceId: string | null } | null): number | null =>
      plan?.prices.find((p) => p.id === plan.currentPriceId)?.amountPence ?? null
    subscription = {
      kind: 'PAID',
      shownStatus: shownStatus(paid),
      planName: paid.plan.name,
      interval: paid.plan.interval,
      amountPence: price?.amountPence ?? null,
      startedAt: paid.startedAt,
      currentPeriodEnd: paid.currentPeriodEnd,
      isCancelledAtPeriodEnd: paid.isCancelledAtPeriodEnd,
      scheduledPlan: scheduled ? { id: scheduled.id, name: scheduled.name, amountPence: priceOf(scheduled) ?? 0 } : null,
      switchTarget: other && !paid.scheduledPlanId ? { id: other.id, name: other.name, amountPence: priceOf(other) ?? 0 } : null,
      purchasedBy: buyer && buyer.status !== 'DELETED' ? `${buyer.firstName ?? ''} ${buyer.lastName ?? ''}`.trim() : 'Deleted user',
      pastDueSince: paid.pastDueSince,
    }
  }

  const address = account?.address as { line1?: string; line2?: string; city?: string; postcode?: string; country?: string } | null
  return {
    subscription,
    trial: trial ? { planName: trial.plan.name, endsAt: trial.currentPeriodEnd } : null,
    details: account
      ? {
          billingName: account.billingName,
          company: account.company,
          email: account.email,
          phone: account.phone,
          address: address ? [address.line1, address.line2, address.city, address.postcode, address.country].filter(Boolean).join(', ') : null,
          card: account.cardBrand && account.cardLast4 ? `${account.cardBrand} ending ${account.cardLast4}` : null,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      status: p.status,
      amountPence: p.amountPence,
      discountPence: p.discountPence,
      amountRefundedPence: p.amountRefundedPence,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  }
}

/** A paid subscription that is past due, past the grace period: shows the banner to managers. */
export async function getPaymentBanner(organisationId: string, now: Date = new Date()): Promise<boolean> {
  const sub = await db.subscription.findFirst({ where: { organisationId, kind: 'PAID', status: 'PAST_DUE' }, select: { pastDueSince: true } })
  return Boolean(sub?.pastDueSince && sub.pastDueSince.getTime() + 7 * 86_400_000 <= now.getTime())
}
