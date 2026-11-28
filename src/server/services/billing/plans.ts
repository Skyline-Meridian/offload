import 'server-only'

import { revalidateTag } from 'next/cache'

import type { BillingInterval, OrganisationType } from '@/generated/prisma/client'
import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import type { Viewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { getStripe } from '@/server/integrations/stripe'
import { lockBilling, syncSubscription } from '@/server/services/billing/sync'
import { notifyManagers } from '@/server/services/billing/notify'
import { requireBillingPermission } from '@/server/services/billing/permissions'

/** Plan changes need `plans.manage` (Administrators only). */
function requirePlansPermission(staff: Viewer): void {
  requireBillingPermission(staff, 'plans.manage')
}

export async function addPlan(staff: Viewer, input: { key: string; name: string; organisationType: OrganisationType; interval: BillingInterval; amountPence: number }): Promise<string> {
  requirePlansPermission(staff)
  if (!/^[a-z0-9_]{3,40}$/.test(input.key)) throw new DomainError('bad-key', 'Use lower case letters, numbers and underscores for the key.')
  if (!Number.isInteger(input.amountPence) || input.amountPence < 100) throw new DomainError('bad-price', 'Enter a price of at least £1.00.')
  if (await db.plan.findUnique({ where: { key: input.key }, select: { id: true } })) throw new DomainError('key-taken', 'A plan with this key already exists.')
  const stripe = getStripe()
  const product = await stripe.products.create({ name: input.name, metadata: { offloadKey: input.key } }, { idempotencyKey: `product:${input.key}` })
  const price = await stripe.prices.create(
    { product: product.id, currency: 'gbp', unit_amount: input.amountPence, recurring: { interval: input.interval === 'MONTH' ? 'month' : 'year' }, lookup_key: input.key, tax_behavior: 'unspecified' },
    { idempotencyKey: `price:${input.key}:${input.amountPence}` },
  )
  const id = await db.$transaction(async (tx) => {
    const last = await tx.plan.aggregate({ _max: { sortOrder: true } })
    const plan = await tx.plan.create({
      data: {
        key: input.key,
        name: input.name,
        organisationType: input.organisationType,
        interval: input.interval,
        stripeProductId: product.id,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        prices: { create: { stripePriceId: price.id, amountPence: input.amountPence } },
      },
      include: { prices: true },
    })
    await tx.plan.update({ where: { id: plan.id }, data: { currentPriceId: plan.prices[0]!.id } })
    await audit(tx, { action: 'billing.plan.add', subjectType: 'Plan', subjectId: plan.id, data: { key: input.key } })
    return plan.id
  })
  revalidateTag('plans', 'max')
  return id
}

/** A new Stripe Price on the same Product. New buyers pay it; existing subscribers keep theirs until moved. */
export async function changePlanPrice(staff: Viewer, planId: string, amountPence: number): Promise<void> {
  requirePlansPermission(staff)
  if (!Number.isInteger(amountPence) || amountPence < 100) throw new DomainError('bad-price', 'Enter a price of at least £1.00.')
  const plan = await db.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new DomainError('not-found', 'Plan not found.')
  const price = await getStripe().prices.create(
    { product: plan.stripeProductId, currency: 'gbp', unit_amount: amountPence, recurring: { interval: plan.interval === 'MONTH' ? 'month' : 'year' }, tax_behavior: 'unspecified' },
    { idempotencyKey: `price:${plan.key}:${amountPence}:${Math.floor(Date.now() / 60000)}` },
  )
  await db.$transaction(async (tx) => {
    const created = await tx.planPrice.create({ data: { planId, stripePriceId: price.id, amountPence } })
    await tx.plan.update({ where: { id: planId }, data: { currentPriceId: created.id } })
    await audit(tx, { action: 'billing.plan.price', subjectType: 'Plan', subjectId: planId, data: { amountPence } })
  })
  revalidateTag('plans', 'max')
}

export async function retirePlan(staff: Viewer, planId: string): Promise<void> {
  requirePlansPermission(staff)
  const plan = await db.plan.findUnique({ where: { id: planId }, include: { prices: true } })
  if (!plan) throw new DomainError('not-found', 'Plan not found.')
  const stripe = getStripe()
  for (const price of plan.prices) await stripe.prices.update(price.stripePriceId, { active: false }).catch(() => undefined)
  await db.$transaction(async (tx) => {
    await tx.plan.update({ where: { id: planId }, data: { isActive: false } })
    await audit(tx, { action: 'billing.plan.retire', subjectType: 'Plan', subjectId: planId })
  })
  revalidateTag('plans', 'max')
}

/** Moves subscribers to the plan's current price from their next renewal, and tells the managers (SUB-9.1). */
export async function moveSubscribersToCurrentPrice(staff: Viewer, planId: string, onlySubscriptionId?: string): Promise<number> {
  requirePlansPermission(staff)
  const plan = await db.plan.findUnique({ where: { id: planId }, include: { prices: true } })
  const current = plan?.prices.find((p) => p.id === plan.currentPriceId)
  if (!plan || !current) throw new DomainError('not-found', 'Plan not found.')
  const subscriptions = await db.subscription.findMany({
    where: { planId, kind: 'PAID', status: { not: 'ENDED' }, planPriceId: { not: current.id }, ...(onlySubscriptionId ? { id: onlySubscriptionId } : {}) },
  })
  const stripe = getStripe()
  let moved = 0
  for (const sub of subscriptions) {
    if (!sub.stripeSubscriptionId) continue
    const live = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
    const item = live.items.data[0]
    if (!item) continue
    await db.$transaction(async (tx) => {
      await lockBilling(tx, sub.organisationId)
      await stripe.subscriptions.update(sub.stripeSubscriptionId!, { items: [{ id: item.id, price: current.stripePriceId }], proration_behavior: 'none' }, { idempotencyKey: `move:${sub.id}:${current.id}` })
      await audit(tx, { action: 'billing.plan.move-subscriber', subjectType: 'Subscription', subjectId: sub.id, relatedOrgId: sub.organisationId, data: { priceId: current.id } })
      await notifyManagers(tx, sub.organisationId, 'billing.plan-changed', { planName: plan.name, amountPence: current.amountPence, date: sub.currentPeriodEnd, notificationType: 'billing.plan-changed' })
    })
    await syncSubscription(sub.stripeSubscriptionId)
    moved += 1
  }
  return moved
}
