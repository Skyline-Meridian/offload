import 'server-only'

import type Stripe from 'stripe'

import { DomainError } from '@/lib/errors'
import { formatMoney } from '@/lib/format/money'
import { routes } from '@/lib/routes'
import type { Viewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { env } from '@/server/env'
import { getStripe, idOf } from '@/server/integrations/stripe'
import { buyBlock, buyBlockMessages, canManageBilling } from '@/server/policies/billing'
import { applyOrHandleDuplicate } from '@/server/services/billing/sync'

const FORTY_EIGHT_HOURS = 48 * 3600 * 1000

type ManagerViewer = Viewer & { organisation: NonNullable<Viewer['organisation']> }

/** The organisation's Stripe Customer, created the first time a manager opens Checkout. One per organisation. */
export async function ensureCustomer(organisationId: string, organisationName: string): Promise<string> {
  const existing = await db.billingAccount.findUnique({ where: { organisationId }, select: { stripeCustomerId: true } })
  if (existing) return existing.stripeCustomerId
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Organisation" WHERE "id" = ${organisationId}::uuid FOR UPDATE`
    const again = await tx.billingAccount.findUnique({ where: { organisationId }, select: { stripeCustomerId: true } })
    if (again) return again.stripeCustomerId
    const customer = await getStripe().customers.create(
      { name: organisationName, metadata: { organisationId } },
      { idempotencyKey: `customer:${organisationId}` },
    )
    await tx.billingAccount.create({ data: { organisationId, stripeCustomerId: customer.id } })
    return customer.id
  })
}

/** Creates a Checkout session for a plan and returns its address (06 implementation section 5.1). */
export async function startCheckout(viewer: Viewer, planId: string): Promise<string> {
  if (!canManageBilling(viewer)) throw new DomainError('not-allowed', buyBlockMessages['not-verified'])
  const manager: ManagerViewer = viewer
  const plan = await db.plan.findUnique({ where: { id: planId }, include: { prices: true } })
  if (!plan) throw new DomainError('not-found', 'This plan is not available.')
  const paid = await db.subscription.findFirst({ where: { organisationId: manager.organisation.id, kind: 'PAID', status: { not: 'ENDED' } }, select: { id: true } })
  const block = buyBlock(viewer, plan, paid !== null)
  if (block) throw new DomainError(block, buyBlockMessages[block])
  const price = plan.prices.find((p) => p.id === plan.currentPriceId)
  if (!price || price.stripePriceId.startsWith('unconfigured_')) throw new DomainError('billing-unavailable', 'Payments are not available right now. Please try again later.')

  const organisationId = manager.organisation.id
  const stripe = getStripe()
  const customerId = await ensureCustomer(organisationId, manager.organisation.name)

  // One open session at a time per organisation.
  const open = await stripe.checkout.sessions.list({ customer: customerId, status: 'open', limit: 10 })
  for (const session of open.data) await stripe.checkout.sessions.expire(session.id).catch(() => undefined)

  // A running staff trial carries over: the paid plan starts when the trial would have ended (SUB-2.5).
  const trial = await db.subscription.findFirst({ where: { organisationId, kind: 'TRIAL', status: 'TRIALING', currentPeriodEnd: { gt: new Date() } }, select: { currentPeriodEnd: true } })
  const trialEnd = trial?.currentPeriodEnd ? Math.floor(Math.max(trial.currentPeriodEnd.getTime(), Date.now() + FORTY_EIGHT_HOURS) / 1000) : null

  const every = plan.interval === 'MONTH' ? 'month' : 'year'
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: customerId,
    client_reference_id: organisationId,
    line_items: [{ price: price.stripePriceId, quantity: 1 }],
    subscription_data: {
      metadata: { organisationId, planId: plan.id, purchasedById: viewer.user.id },
      ...(trialEnd ? { trial_end: trialEnd } : {}),
    },
    // Cards, Apple Pay and Google Pay only: set in the Stripe dashboard (Settings, Payment methods).
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    custom_fields: [{ key: 'company', label: { type: 'custom', custom: 'Company name' }, type: 'text', optional: true }],
    customer_update: { name: 'auto', address: 'auto' },
    consent_collection: { terms_of_service: 'required' },
    custom_text: {
      terms_of_service_acceptance: {
        message: `I agree to the [Terms and Conditions](${env.APP_URL}${routes.terms}) and the [Refund Policy](${env.APP_URL}${routes.refundPolicy}).`,
      },
      submit: {
        message: `Your subscription renews automatically every ${every} at ${formatMoney(price.amountPence)} until you cancel. You can cancel at any time from your subscription page.`,
      },
    },
    success_url: `${env.APP_URL}${routes.billingSuccess}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}${routes.pricing}`,
  }
  const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `checkout:${organisationId}:${price.id}:${Math.floor(Date.now() / 60000)}` })
  if (!session.url) throw new DomainError('billing-unavailable', 'Payments are not available right now. Please try again later.')
  return session.url
}

export type CheckoutResult =
  | { state: 'done'; planName: string; amountPence: number; nextDate: Date | null }
  | { state: 'waiting' }
  | { state: 'failed' }

/** The success page: sync the subscription now, so access starts even if the webhook is late. */
export async function completeCheckout(viewer: Viewer, sessionId: string): Promise<CheckoutResult> {
  if (!canManageBilling(viewer)) throw new DomainError('not-allowed', buyBlockMessages['not-verified'])
  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
  if (session.client_reference_id !== viewer.organisation.id) throw new DomainError('not-allowed', 'This payment belongs to another organisation.')
  if (session.status === 'expired') return { state: 'failed' }
  if (session.status !== 'complete' || !session.subscription) return { state: 'waiting' }

  const subscription = typeof session.subscription === 'string' ? await getStripe().subscriptions.retrieve(session.subscription, { expand: ['discounts'] }) : session.subscription
  await applyOrHandleDuplicate(subscription)
  const local = await db.subscription.findUnique({ where: { stripeSubscriptionId: idOf(subscription) ?? '' }, include: { plan: true } })
  if (!local) return { state: 'waiting' }
  const price = local.planPriceId ? await db.planPrice.findUnique({ where: { id: local.planPriceId }, select: { amountPence: true } }) : null
  return { state: 'done', planName: local.plan.name, amountPence: price?.amountPence ?? 0, nextDate: local.currentPeriodEnd }
}

/** A Stripe Customer Portal session for payment method and billing details. */
export async function createPortalUrl(viewer: Viewer): Promise<string> {
  if (!canManageBilling(viewer)) throw new DomainError('not-allowed', buyBlockMessages['not-verified'])
  const account = await db.billingAccount.findUnique({ where: { organisationId: viewer.organisation.id }, select: { stripeCustomerId: true } })
  if (!account) throw new DomainError('no-account', 'You have no billing details yet.')
  const session = await getStripe().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${env.APP_URL}${routes.subscription}`,
    ...(env.STRIPE_PORTAL_CONFIGURATION_ID ? { configuration: env.STRIPE_PORTAL_CONFIGURATION_ID } : {}),
  })
  return session.url
}

/** A short-lived link to the invoice PDF (06 design section 6.1). */
export async function invoicePdfUrl(viewer: Viewer, paymentId: string): Promise<string> {
  if (!canManageBilling(viewer)) throw new DomainError('not-allowed', buyBlockMessages['not-verified'])
  const payment = await db.payment.findFirst({ where: { id: paymentId, organisationId: viewer.organisation.id }, select: { stripeInvoiceId: true } })
  if (!payment?.stripeInvoiceId) throw new DomainError('not-found', 'Invoice not found.')
  const invoice = await getStripe().invoices.retrieve(payment.stripeInvoiceId)
  if (!invoice.invoice_pdf) throw new DomainError('not-found', 'Invoice not found.')
  return invoice.invoice_pdf
}
