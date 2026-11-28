'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { DomainError } from '@/lib/errors'
import { formToObject, type FormState } from '@/lib/form-state'
import { messages } from '@/lib/messages'
import { loginWithNext, routes } from '@/lib/routes'
import { applicationStatusSchema, applySchema } from '@/lib/validation/offer'
import { runAsUser } from '@/server/context'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { canViewApplications } from '@/server/policies/offers'
import { applyToOffer, setApplicationStatus, withdrawApplication } from '@/server/services/applications'

export async function apply(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.offers))
  const parsed = applySchema.safeParse(formToObject(formData))
  if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => applyToOffer(viewer, parsed.data.offerId, parsed.data.note))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('apply failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'Your application has been sent.' }
}

export async function withdraw(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myApplications))
  const id = z.uuid().safeParse(formData.get('applicationId'))
  if (!id.success || viewer.role !== 'PLAYER') return { status: 'error', message: messages.genericError }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => withdrawApplication(viewer.user.id, id.data))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('withdraw failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'Application withdrawn.' }
}

export async function changeApplicationStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.applications))
  if (!canViewApplications(viewer)) return { status: 'error', message: messages.notAllowed }
  const parsed = applicationStatusSchema.safeParse(formToObject(formData))
  if (!parsed.success) return { status: 'error', message: messages.genericError }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => setApplicationStatus(viewer, parsed.data.applicationId, parsed.data.status))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('application status failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: messages.saved }
}
