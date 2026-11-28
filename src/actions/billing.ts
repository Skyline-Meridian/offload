'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { DomainError } from '@/lib/errors'
import type { FormState } from '@/lib/form-state'
import { messages } from '@/lib/messages'
import { loginWithNext, routes } from '@/lib/routes'
import { runAsUser } from '@/server/context'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { canManageBilling } from '@/server/policies/billing'
import { createPortalUrl, startCheckout } from '@/server/services/billing/checkout'
import { cancelAtPeriodEnd, cancelPlanSwitch, schedulePlanSwitch, undoCancel } from '@/server/services/billing/lifecycle'

const planSchema = z.uuid()

/** "Subscribe": checks the policy, makes the Checkout session and sends the browser there. */
export async function subscribeToPlan(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.pricing))
  const planId = planSchema.safeParse(formData.get('planId'))
  if (!planId.success) return { status: 'error', message: messages.genericError }
  let url: string
  try {
    url = await runAsUser(viewer.user.id, viewer.role, () => startCheckout(viewer, planId.data))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('checkout failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(url)
}

/** "Update payment method" and "Update billing details": the Stripe Customer Portal. */
export async function openBillingPortal(): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.subscription))
  let url: string
  try {
    url = await createPortalUrl(viewer)
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('portal failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(url)
}

async function manage(work: (userId: string, organisationId: string) => Promise<void>, done: string): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.subscription))
  if (!canManageBilling(viewer)) return { status: 'error', message: messages.notAllowed }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => work(viewer.user.id, viewer.organisation.id))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('billing change failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: done }
}

export async function cancelSubscription(): Promise<FormState> {
  return manage(cancelAtPeriodEnd, 'Your subscription will end at the end of the current period.')
}

export async function undoCancellation(): Promise<FormState> {
  return manage(undoCancel, 'Your subscription will continue.')
}

export async function switchPlan(_prev: FormState, formData: FormData): Promise<FormState> {
  const planId = planSchema.safeParse(formData.get('planId'))
  if (!planId.success) return { status: 'error', message: messages.genericError }
  return manage((userId, organisationId) => schedulePlanSwitch(userId, organisationId, planId.data), 'Your plan will change at the end of the current period.')
}

export async function cancelSwitch(): Promise<FormState> {
  return manage(cancelPlanSwitch, 'The plan change was cancelled.')
}
