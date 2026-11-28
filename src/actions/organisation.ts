'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import type { OrgTypeKey } from '@/lib/constants'
import { DomainError } from '@/lib/errors'
import { formToObject, type FormState } from '@/lib/form-state'
import { messages } from '@/lib/messages'
import { loginWithNext, routes } from '@/lib/routes'
import {
  coachSchema,
  inapplicableFieldErrors,
  organisationSchema,
  parseOrganisationFilters,
  pathwaySchema,
  registrationOrganisationSchema,
  seasonSchema,
  trainingSessionSchema,
} from '@/lib/validation/organisation'
import type { OrganisationPickerOption } from '@/lib/view-models/organisations'
import { runAsUser } from '@/server/context'
import { getViewer, type Viewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { searchOrganisations, searchOrganisationsForPicker, type OrganisationPage } from '@/server/dal/organisations'
import { errorInfo, log } from '@/server/log'
import { canEditOrganisation } from '@/server/policies/organisations'
import { removeOrganisationFromProfile } from '@/server/services/organisations/members'
import { claimOrganisation, findPossibleDuplicates, registerOrganisation, type DuplicateCandidate, type NewOrganisationInput } from '@/server/services/organisations/register'
import { submitManagerDocument, updateManagerIdentity } from '@/server/services/organisations/manager'
import * as update from '@/server/services/organisations/update'
import { identitySchema } from '@/lib/validation/player'

type Raw = Record<string, FormDataEntryValue | FormDataEntryValue[]>

/** The viewer must be a manager who may edit their organisation. */
async function editableOrganisation(): Promise<{ viewer: Viewer; organisationId: string; type: OrgTypeKey } | FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myOrganisation))
  const organisation = viewer.organisation
  if (!organisation || !canEditOrganisation(viewer, organisation)) return { status: 'error', message: messages.notAllowed }
  return { viewer, organisationId: organisation.id, type: organisation.type as OrgTypeKey }
}

function isFormState(value: unknown): value is FormState {
  return typeof value === 'object' && value !== null && 'status' in value
}

async function guard(save: (ctx: { viewer: Viewer; organisationId: string; type: OrgTypeKey }) => Promise<FormState | void>): Promise<FormState> {
  const ctx = await editableOrganisation()
  if (isFormState(ctx)) return ctx
  try {
    const result = await runAsUser(ctx.viewer.user.id, ctx.viewer.role, () => save(ctx))
    return result ?? { status: 'ok', message: messages.saved }
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('organisation save failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
}

export async function saveOrganisation(_prev: FormState, formData: FormData): Promise<FormState> {
  return guard(async ({ viewer, organisationId, type }) => {
    const raw: Raw = { ...formToObject(formData), leagueIds: formData.getAll('leagueIds') }
    const inapplicable = inapplicableFieldErrors(type, raw)
    if (Object.keys(inapplicable).length > 0) return { status: 'error', fieldErrors: inapplicable }
    const parsed = organisationSchema(type).safeParse(raw)
    if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    const { pendingReview } = await update.updateOrganisation(viewer.user.id, organisationId, type, parsed.data)
    return {
      status: 'ok',
      message: pendingReview
        ? 'Saved. Changes to name, country, registration number or document will show after Offload approves them.'
        : messages.saved,
    }
  })
}

function childAction<S extends z.ZodType>(schema: S, save: (userId: string, organisationId: string, data: z.output<S>) => Promise<void>) {
  return async (_prev: FormState, formData: FormData): Promise<FormState> =>
    guard(async ({ viewer, organisationId }) => {
      const parsed = schema.safeParse(formToObject(formData))
      if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
      await save(viewer.user.id, organisationId, parsed.data)
    })
}

export const saveCoachEntry = childAction(coachSchema, (u, o, d) => update.saveCoach(u, o, d))
export const saveSeasonEntry = childAction(seasonSchema, (_u, o, d) => update.saveSeason(o, d))
export const saveSessionEntry = childAction(trainingSessionSchema, (_u, o, d) => update.saveTrainingSession(o, d))
export const savePathwayEntry = childAction(pathwaySchema, (_u, o, d) => update.savePathway(o, d))

export async function deleteChildEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  return guard(async ({ organisationId }) => {
    const kind = z.enum(['coach', 'season', 'trainingSession', 'pathway']).safeParse(formData.get('kind'))
    const id = z.uuid().safeParse(formData.get('id'))
    if (!kind.success || !id.success) return { status: 'error', message: messages.genericError }
    await update.deleteChild(organisationId, kind.data, id.data)
    return { status: 'ok', message: 'Deleted' }
  })
}

export async function resubmitOrganisation(): Promise<FormState> {
  return guard(async ({ viewer, organisationId }) => {
    await update.resubmitOrganisation(viewer.user.id, organisationId)
    return { status: 'ok', message: 'Sent for review.' }
  })
}

// ─── Membership ─────────────────────────────────────────────────────────

async function signedInManager(): Promise<Viewer | FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myOrganisation))
  if (viewer.role !== 'MANAGER') return { status: 'error', message: messages.notAllowed }
  return viewer
}

export async function leaveOrganisation(): Promise<FormState> {
  const viewer = await signedInManager()
  if (isFormState(viewer)) return viewer
  try {
    await runAsUser(viewer.user.id, viewer.role, () => removeOrganisationFromProfile(viewer.user.id))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('leave organisation failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'You have left the organisation.' }
}

/** A manager with no organisation asks to manage an existing one. */
export async function claimExistingOrganisation(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await signedInManager()
  if (isFormState(viewer)) return viewer
  const id = z.uuid().safeParse(formData.get('organisationId'))
  if (!id.success) return { status: 'error', fieldErrors: { organisationId: ['Choose an organisation'] } }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => db.$transaction((tx) => claimOrganisation(tx, viewer.user.id, id.data)))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('claim failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(routes.myOrganisation)
}

/** A manager with no organisation adds a new one of their registered type. */
export async function addNewOrganisation(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await signedInManager()
  if (isFormState(viewer)) return viewer
  const type = z.enum(['CLUB', 'UNION', 'INSTITUTION', 'BRAND']).safeParse(formData.get('type'))
  if (!type.success) return { status: 'error', message: messages.genericError }
  const form = formToObject(formData)
  const parsed = registrationOrganisationSchema(type.data).safeParse({
    name: form.name,
    country: form.country,
    officialEmail: form.officialEmail,
    officialPhone: form.officialPhone,
    registrationNumber: form.registrationNumber,
    website: form.website,
    industryId: form.industryId,
    industryOther: form.industryOther,
    institutionKind: form.institutionKind,
  })
  if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  try {
    await runAsUser(viewer.user.id, viewer.role, () =>
      db.$transaction((tx) => registerOrganisation(tx, viewer.user.id, { ...(parsed.data as NewOrganisationInput), type: type.data })),
    )
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('add organisation failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(routes.myOrganisation)
}

// ─── The manager's own profile ──────────────────────────────────────────

export async function saveManagerIdentity(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await signedInManager()
  if (isFormState(viewer)) return viewer
  const parsed = identitySchema.safeParse({ ...formToObject(formData), nationalities: formData.getAll('nationalities') })
  if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => updateManagerIdentity(viewer.user.id, parsed.data))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('manager profile save failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: messages.saved }
}

export async function submitManagerDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await signedInManager()
  if (isFormState(viewer)) return viewer
  const fileId = z.uuid().safeParse(formData.get('fileId'))
  if (!fileId.success) return { status: 'error', fieldErrors: { fileId: ['Upload your document first.'] } }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => submitManagerDocument(viewer.user.id, fileId.data))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('manager document submit failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'Your document has been sent for review.' }
}

// ─── Lookups used by forms ──────────────────────────────────────────────

const typeSchema = z.enum(['CLUB', 'UNION', 'INSTITUTION', 'BRAND'])

/** "Is this your organisation?" while adding a new one. Open to anyone who is registering. */
export async function checkDuplicateOrganisations(input: {
  type: string
  name: string
  country: string
  registrationNumber?: string
}): Promise<DuplicateCandidate[]> {
  const type = typeSchema.safeParse(input.type)
  if (!type.success || input.name.trim().length < 3 || input.country.length !== 2) return []
  return findPossibleDuplicates(db, { type: type.data, name: input.name.trim(), country: input.country, registrationNumber: input.registrationNumber })
}

/** Search for published organisations of one type: claim picker and current-club pickers. */
export async function searchOrganisationOptions(type: string, q: string): Promise<OrganisationPickerOption[]> {
  const parsed = typeSchema.safeParse(type)
  if (!parsed.success) return []
  return searchOrganisationsForPicker(parsed.data, q)
}

export async function loadMoreOrganisations(type: string, params: Record<string, string>, cursor: string): Promise<OrganisationPage | null> {
  const parsed = typeSchema.safeParse(type)
  const viewer = await getViewer()
  if (!parsed.success || !viewer) return null
  return searchOrganisations(parsed.data, parseOrganisationFilters(params), cursor)
}
