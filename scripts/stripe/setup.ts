// Creates the Stripe products, prices and Customer Portal configuration for Offload.
// Safe to run again: everything is found by lookup key or metadata first.
//
//   npx tsx --env-file=.env.local scripts/stripe/setup.ts
//
// Use a test-mode key first, then the live key (in .env.prod on the VM or a temporary env file).
// It writes prisma/data/plans.<test|live>.json, which `npm run db:seed` reads.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import Stripe from 'stripe'

import { plans } from '../../prisma/data/reference'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  process.stderr.write('STRIPE_SECRET_KEY is not set.\n')
  process.exit(1)
}
const mode = key.includes('_test_') ? 'test' : 'live'
const stripe = new Stripe(key, { apiVersion: '2026-11-18.endive', appInfo: { name: 'offload-setup' } })
const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://offloadagency.com'

process.stdout.write(`Stripe mode: ${mode}\n`)

const result: Record<string, { productId: string; priceId: string }> = {}

for (const plan of plans) {
  const found = await stripe.products.search({ query: `metadata['offloadKey']:'${plan.key}'`, limit: 1 })
  const product = found.data[0] ?? (await stripe.products.create({ name: plan.name, metadata: { offloadKey: plan.key } }))

  const prices = await stripe.prices.list({ lookup_keys: [plan.key], active: true, limit: 1 })
  const price =
    prices.data[0] ??
    (await stripe.prices.create({
      product: product.id,
      currency: 'gbp',
      unit_amount: plan.amountPence,
      recurring: { interval: plan.interval === 'MONTH' ? 'month' : 'year' },
      lookup_key: plan.key,
      tax_behavior: 'unspecified',
    }))
  result[plan.key] = { productId: product.id, priceId: price.id }
  process.stdout.write(`  ${plan.key}: ${product.id} ${price.id}\n`)
}

// Customer Portal: payment method, billing details and invoices only. Cancel and plan changes happen on our own page.
const existing = (await stripe.billingPortal.configurations.list({ active: true, limit: 20 })).data.find((c) => c.metadata?.offload === 'portal')
const portalSettings: Stripe.BillingPortal.ConfigurationCreateParams = {
  metadata: { offload: 'portal' },
  business_profile: { headline: 'Offload billing', privacy_policy_url: `${siteUrl}/privacy-policy`, terms_of_service_url: `${siteUrl}/terms-and-conditions` },
  features: {
    payment_method_update: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ['name', 'email', 'address', 'phone'] },
    invoice_history: { enabled: true },
    subscription_cancel: { enabled: false },
    subscription_update: { enabled: false },
  },
}
const portal = existing ?? (await stripe.billingPortal.configurations.create(portalSettings))
process.stdout.write(`\nSTRIPE_PORTAL_CONFIGURATION_ID=${portal.id}\n`)

const file = join(process.cwd(), 'prisma', 'data', `plans.${mode}.json`)
writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(`\nWrote ${file}. Run "npm run db:seed" to store the ids.\n`)

process.stdout.write(`
Set these by hand in the Stripe dashboard (${mode} mode):
  [ ] Settings > Billing > Subscriptions and emails > Retries: Smart Retries on, up to 8 attempts within 2 weeks, then CANCEL the subscription
  [ ] Settings > Customer emails: turn everything off (successful payments, refunds, failed payments, upcoming renewals, trial reminders). Offload sends its own.
  [ ] Settings > Tax: Stripe Tax off, no tax ids collected
  [ ] Settings > Payment methods: cards, Apple Pay and Google Pay only
  [ ] Settings > Public details (or Checkout settings): set the Terms of service URL to ${siteUrl}/terms-and-conditions (Checkout needs it for the terms checkbox)
  [ ] Developers > Webhooks: add ${siteUrl}/api/stripe/webhook, API version 2026-11-18.endive, with these events:
        checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted,
        invoice.paid, invoice.payment_failed, invoice.payment_action_required, charge.refunded, refund.updated,
        customer.updated, payment_method.attached, subscription_schedule.released, subscription_schedule.canceled
      Copy its signing secret into STRIPE_WEBHOOK_SECRET.
  [ ] Put STRIPE_PORTAL_CONFIGURATION_ID (above) into the env file.
Local testing: "stripe listen --forward-to localhost:3000/api/stripe/webhook" prints a signing secret for STRIPE_WEBHOOK_SECRET.
`)
