import type Stripe from 'stripe'

import { runAsSystem } from '@/server/context'
import { env } from '@/server/env'
import { getStripe } from '@/server/integrations/stripe'
import { handleStripeEvent } from '@/server/services/billing/webhook'

export async function POST(request: Request): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('not configured', { status: 503 })
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return new Response('invalid signature', { status: 400 })
  }
  const status = await runAsSystem(`stripe:${event.type}`, () => handleStripeEvent(event))
  return new Response(null, { status })
}
