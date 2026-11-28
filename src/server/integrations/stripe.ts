import 'server-only'

import Stripe from 'stripe'

import { DomainError } from '@/lib/errors'
import { env } from '@/server/env'

/** The one API version used everywhere. The webhook endpoint in the Stripe dashboard uses the same version. */
export const STRIPE_API_VERSION = '2026-11-18.endive' as const

let client: Stripe | undefined

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY)
}

/** The Stripe client. Throws a friendly error when the key is not set (for example on a fresh local set-up). */
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new DomainError('billing-unavailable', 'Payments are not available right now. Please try again later.')
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    appInfo: { name: 'offload' },
  })
  return client
}

/** The id of a Stripe object or an expanded object. */
export function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

/** The PaymentIntent that paid an invoice, for refunds. */
export async function paymentIntentForInvoice(invoiceId: string): Promise<string | null> {
  const payments = await getStripe().invoicePayments.list({ invoice: invoiceId, status: 'paid', expand: ['data.payment.payment_intent'] })
  for (const p of payments.data) {
    if (p.payment.type === 'payment_intent') return idOf(p.payment.payment_intent)
  }
  return null
}

/** The invoice a PaymentIntent paid, to link refunds to payments. */
export async function invoiceIdForPaymentIntent(paymentIntentId: string): Promise<string | null> {
  const payments = await getStripe().invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: paymentIntentId } })
  const first = payments.data[0]
  return first ? idOf(first.invoice) : null
}
