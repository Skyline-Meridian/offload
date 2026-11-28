'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { DomainError } from '@/lib/errors'
import { formToObject, type FormState } from '@/lib/form-state'
import { messages } from '@/lib/messages'
import { loginWithNext, routes } from '@/lib/routes'
import { offerDraftSchema, offerPublishSchema, parseOfferFilters } from '@/lib/validation/offer'
import { runAsUser } from '@/server/context'
import { searchOffers, type OfferPage } from '@/server/dal/offers'
import { getViewer, type Viewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { canManageOffers } from '@/server/policies/offers'
import * as offers from '@/server/services/offers'

type OfferContext = { viewer: Viewer & { organisation: NonNullable<Viewer['organisation']> } }

async function context(): Promise<OfferContext | FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myOffers))
  if (!canManageOffers(viewer)) return { status: 'error', message: messages.notAllowed }
  return { viewer }
}

function isState(value: unknown): value is FormState {
  return typeof value === 'object' && value !== null && 'status' in value
}

async function run(
  work: (ctx: { organisationId: string; offeredBy: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND'; userId: string }) => Promise<FormState | void>,
): Promise<FormState> {
  const ctx = await context()
  if (isState(ctx)) return ctx
  const { viewer } = ctx
  try {
    const result = await runAsUser(viewer.user.id, viewer.role, () =>
      work({ organisationId: viewer.organisation.id, offeredBy: viewer.organisation.type, userId: viewer.user.id }),
    )
    revalidateTag(`org-offers:${viewer.organisation.id}`, 'max')
    return result ?? { status: 'ok', message: messages.saved }
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('offer action failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
}

/** The offer form has two buttons: "Save draft" and "Publish". `offerId` is set when editing. */
export async function saveOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formToObject(formData)
  const intent = String(formData.get('intent') ?? 'draft')
  const offerId = z.uuid().safeParse(formData.get('offerId'))
  const input = { ...raw, positionIds: formData.getAll('positionIds'), skillIds: formData.getAll('skillIds') }

  let target: string | undefined
  const result = await run(async (c) => {
    if (intent === 'publish') {
      const parsed = offerPublishSchema.safeParse(input)
      if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
      target = await offers.publish(c, parsed.data, offerId.success ? offerId.data : undefined)
      return
    }
    const parsed = offerDraftSchema.safeParse(input)
    if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    if (offerId.success) {
      await offers.updateOffer(c, offerId.data, parsed.data)
      target = offerId.data
    } else {
      target = await offers.saveDraft(c, parsed.data)
    }
  })
  if (result.status === 'ok') redirect(intent === 'publish' || intent === 'update' ? routes.myOffers : `${routes.myOffers}/${target}/edit`)
  return result
}

const idSchema = z.uuid()

export async function closeOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get('offerId'))
  if (!id.success) return { status: 'error', message: messages.genericError }
  return run(async (c) => {
    await offers.closeOffer(c, id.data)
    return { status: 'ok', message: 'Offer closed.' }
  })
}

export async function deleteOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get('offerId'))
  if (!id.success) return { status: 'error', message: messages.genericError }
  return run(async (c) => {
    await offers.deleteOffer(c, id.data)
    return { status: 'ok', message: 'Offer deleted.' }
  })
}

export async function copyOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = idSchema.safeParse(formData.get('offerId'))
  if (!id.success) return { status: 'error', message: messages.genericError }
  let copyId: string | undefined
  const result = await run(async (c) => {
    copyId = await offers.copyOffer(c, id.data)
  })
  if (result.status === 'ok' && copyId) redirect(`${routes.myOffers}/${copyId}/edit`)
  return result
}

export async function loadMoreOffers(params: Record<string, string>, cursor: string): Promise<OfferPage | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  return searchOffers(parseOfferFilters(params), cursor)
}
