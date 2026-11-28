import 'server-only'

import { revalidateTag } from 'next/cache'
import type Stripe from 'stripe'

import { audit } from '@/server/audit'
import { db } from '@/server/db'
import { getStripe, idOf, invoiceIdForPaymentIntent } from '@/server/integrations/stripe'
import { errorInfo, log } from '@/server/log'
import { notifyManagers, notifyStaff } from '@/server/services/billing/notify'
import { syncCustomer, syncInvoice, syncSubscription } from '@/server/services/billing/sync'

/** Stores one Stripe refund as a Refund row and brings the payment's refunded total up to date. */
export async function applyStripeRefund(refund: Stripe.Refund): Promise<void> {
  if (refund.status !== 'succeeded' && refund.status !== 'pending') return
  const intent = idOf(refund.payment_intent)
  if (!intent) return
  const invoiceId = await invoiceIdForPaymentIntent(intent)
  const payment = invoiceId ? await db.payment.findUnique({ where: { stripeInvoiceId: invoiceId }, include: { subscription: { include: { plan: true } } } }) : null
  if (!payment) return

  await db.$transaction(async (tx) => {
    const existing = await tx.refund.findUnique({ where: { stripeRefundId: refund.id } })
    if (existing) {
      await tx.refund.update({ where: { id: existing.id }, data: { amountPence: refund.amount } })
    } else {
      await tx.refund.create({
        data: { paymentId: payment.id, stripeRefundId: refund.id, amountPence: refund.amount, reason: refund.metadata?.reason ?? refund.reason ?? 'Refunded in Stripe' },
      })
    }
    const total = await tx.refund.aggregate({ where: { paymentId: payment.id }, _sum: { amountPence: true } })
    await tx.payment.update({ where: { id: payment.id }, data: { amountRefundedPence: total._sum.amountPence ?? 0 } })
    if (!existing) {
      const info = { planName: payment.subscription.plan.name, amountPence: refund.amount, link: '/dashboard/subscription', notificationType: 'billing.refund' }
      await notifyManagers(tx, payment.organisationId, 'billing.refund', info)
      await notifyStaff(tx, payment.organisationId, 'billing.staff-refund', { planName: info.planName, amountPence: refund.amount })
      await audit(tx, { action: 'billing.refund.received', subjectType: 'Payment', subjectId: payment.id, relatedOrgId: payment.organisationId, data: { amountPence: refund.amount } })
    }
  })
}

async function clearSchedule(scheduleId: string): Promise<void> {
  await db.subscription.updateMany({ where: { stripeScheduleId: scheduleId }, data: { scheduledPlanId: null, stripeScheduleId: null } })
}

async function route(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const subscription = idOf(event.data.object.subscription as string | { id: string } | null)
      if (subscription) await syncSubscription(subscription)
      return
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object.id)
      return
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_action_required': {
      const invoice = event.data.object
      await syncInvoice(invoice.id)
      const subscription = invoice.parent?.subscription_details ? idOf(invoice.parent.subscription_details.subscription) : null
      if (subscription) await syncSubscription(subscription)
      return
    }
    case 'charge.refunded': {
      const refunds = await getStripe().refunds.list({ charge: event.data.object.id, limit: 20 })
      for (const refund of refunds.data) await applyStripeRefund(refund)
      return
    }
    case 'refund.updated':
      await applyStripeRefund(event.data.object)
      return
    case 'customer.updated':
      await syncCustomer(event.data.object.id)
      return
    case 'payment_method.attached': {
      const customer = idOf(event.data.object.customer)
      if (customer) await syncCustomer(customer)
      return
    }
    case 'subscription_schedule.released':
    case 'subscription_schedule.canceled':
      await clearSchedule(event.data.object.id)
      return
    default:
      return
  }
}

/** Handles one verified event once (06 design section 9.1). Returns the HTTP status to answer with. */
export async function handleStripeEvent(event: Stripe.Event): Promise<200 | 500> {
  const inserted = await db.$executeRaw`
    INSERT INTO "WebhookEvent" ("id", "type", "createdAt") VALUES (${event.id}, ${event.type}, now())
    ON CONFLICT ("id") DO NOTHING`
  if (inserted === 0) {
    const seen = await db.webhookEvent.findUnique({ where: { id: event.id }, select: { processedAt: true } })
    if (seen?.processedAt) return 200
  }
  try {
    await route(event)
    await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: null } })
    revalidateTag('plans', 'max')
    return 200
  } catch (error) {
    log.error('stripe event failed', { eventType: event.type, ...errorInfo(error) })
    await db.webhookEvent.update({ where: { id: event.id }, data: { error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error' } }).catch(() => undefined)
    return 500
  }
}
