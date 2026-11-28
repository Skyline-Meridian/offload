import 'server-only'

import type { DiscountDuration } from '@/generated/prisma/client'
import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import type { Viewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { getStripe } from '@/server/integrations/stripe'
import { lockBilling, syncSubscription } from '@/server/services/billing/sync'
import { requireBillingPermission } from '@/server/services/billing/permissions'

export type NewDiscountCode = {
  code: string
  percentOff: number
  /** Empty means every plan. */
  planIds: string[]
  duration: DiscountDuration
  durationMonths?: number
  expiresAt?: Date
  maxRedemptions?: number
}

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase()
}

/** One Stripe Coupon (percent, duration, plans) and one Promotion Code (the code, expiry, uses). */
export async function createDiscountCode(staff: Viewer, input: NewDiscountCode): Promise<string> {
  requireBillingPermission(staff, 'billing.manage')
  const code = normaliseCode(input.code)
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new DomainError('bad-code', 'Use 3 to 30 letters, numbers, hyphens or underscores.')
  if (input.percentOff < 1 || input.percentOff > 100) throw new DomainError('bad-percent', 'The discount must be between 1% and 100%.')
  if (input.duration === 'REPEATING' && !input.durationMonths) throw new DomainError('bad-duration', 'Say how many months the discount lasts.')
  if (await db.discountCode.findFirst({ where: { code, isActive: true }, select: { id: true } })) throw new DomainError('code-taken', 'This code already exists.')

  const plans = input.planIds.length ? await db.plan.findMany({ where: { id: { in: input.planIds } }, select: { id: true, stripeProductId: true } }) : []
  if (plans.length !== input.planIds.length) throw new DomainError('bad-plan', 'One of the chosen plans does not exist.')

  const stripe = getStripe()
  const coupon = await stripe.coupons.create(
    {
      percent_off: input.percentOff,
      duration: input.duration === 'ONCE' ? 'once' : input.duration === 'REPEATING' ? 'repeating' : 'forever',
      ...(input.duration === 'REPEATING' ? { duration_in_months: input.durationMonths } : {}),
      ...(plans.length ? { applies_to: { products: plans.map((p) => p.stripeProductId) } } : {}),
      name: code,
    },
    { idempotencyKey: `coupon:${code}:${input.percentOff}:${Math.floor(Date.now() / 60000)}` },
  )
  const promotion = await stripe.promotionCodes.create(
    {
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
      ...(input.expiresAt ? { expires_at: Math.floor(input.expiresAt.getTime() / 1000) } : {}),
      ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    },
    { idempotencyKey: `promo:${coupon.id}` },
  )
  return db.$transaction(async (tx) => {
    const row = await tx.discountCode.create({
      data: {
        code,
        percentOff: input.percentOff,
        duration: input.duration,
        durationMonths: input.durationMonths ?? null,
        expiresAt: input.expiresAt ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        stripeCouponId: coupon.id,
        stripePromotionCodeId: promotion.id,
        plans: { create: plans.map((p) => ({ planId: p.id })) },
      },
    })
    await audit(tx, { action: 'billing.discount.create', subjectType: 'DiscountCode', subjectId: row.id, data: { percentOff: input.percentOff } })
    return row.id
  })
}

/** Stripe cannot change a promotion code's limits, so the old one is retired and a new one made with the same code. */
export async function changeDiscountLimits(staff: Viewer, id: string, limits: { expiresAt?: Date | null; maxRedemptions?: number | null }): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  const row = await db.discountCode.findUnique({ where: { id } })
  if (!row || !row.isActive) throw new DomainError('not-found', 'Discount code not found.')
  const expiresAt = limits.expiresAt === undefined ? row.expiresAt : limits.expiresAt
  const max = limits.maxRedemptions === undefined ? row.maxRedemptions : limits.maxRedemptions
  if (max !== null && max <= row.timesRedeemed) throw new DomainError('bad-limit', 'The limit must be higher than the number of times the code has been used.')

  const stripe = getStripe()
  await stripe.promotionCodes.update(row.stripePromotionCodeId, { active: false })
  const promotion = await stripe.promotionCodes.create(
    {
      promotion: { type: 'coupon', coupon: row.stripeCouponId },
      code: row.code,
      ...(expiresAt ? { expires_at: Math.floor(expiresAt.getTime() / 1000) } : {}),
      ...(max !== null ? { max_redemptions: max - row.timesRedeemed } : {}),
    },
    { idempotencyKey: `promo-limits:${id}:${Math.floor(Date.now() / 60000)}` },
  )
  await db.$transaction(async (tx) => {
    await tx.discountCode.update({ where: { id }, data: { expiresAt, maxRedemptions: max, stripePromotionCodeId: promotion.id } })
    await audit(tx, { action: 'billing.discount.limits', subjectType: 'DiscountCode', subjectId: id })
  })
}

export async function expireDiscountCode(staff: Viewer, id: string): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  const row = await db.discountCode.findUnique({ where: { id } })
  if (!row) throw new DomainError('not-found', 'Discount code not found.')
  await getStripe().promotionCodes.update(row.stripePromotionCodeId, { active: false })
  await db.$transaction(async (tx) => {
    await tx.discountCode.update({ where: { id }, data: { isActive: false } })
    await audit(tx, { action: 'billing.discount.expire', subjectType: 'DiscountCode', subjectId: id })
  })
}

/** Staff add a code's discount to a running subscription. */
export async function applyDiscountToSubscription(staff: Viewer, subscriptionId: string, discountCodeId: string): Promise<void> {
  requireBillingPermission(staff, 'billing.manage')
  const [subscription, code] = await Promise.all([
    db.subscription.findUnique({ where: { id: subscriptionId } }),
    db.discountCode.findUnique({ where: { id: discountCodeId } }),
  ])
  if (!subscription?.stripeSubscriptionId || !code || !code.isActive) throw new DomainError('not-found', 'Subscription or discount code not found.')
  const stripeId = subscription.stripeSubscriptionId
  await db.$transaction(async (tx) => {
    await lockBilling(tx, subscription.organisationId)
    await getStripe().subscriptions.update(stripeId, { discounts: [{ coupon: code.stripeCouponId }] }, { idempotencyKey: `discount:${subscriptionId}:${discountCodeId}` })
    await tx.subscription.update({ where: { id: subscriptionId }, data: { discountCodeId } })
    await audit(tx, { action: 'billing.discount.apply', subjectType: 'Subscription', subjectId: subscriptionId, relatedOrgId: subscription.organisationId, data: { discountCodeId } })
  })
  await syncSubscription(stripeId)
}
