'use server'

import { redirect } from 'next/navigation'
import type { z } from 'zod'

import { DomainError } from '@/lib/errors'
import { formToObject, type FormState } from '@/lib/form-state'
import { loginWithNext, routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import {
  academicSchema,
  achievementSchema,
  clubHistorySchema,
  conditioningSchema,
  cvSchema,
  eligibilitySchema,
  featuredVideoSchema,
  highlightVideoSchema,
  identitySchema,
  parsePlayerFilters,
  playingSchema,
  socialSchema,
} from '@/lib/validation/player'
import { runAsUser } from '@/server/context'
import { getViewer } from '@/server/dal/viewer'
import { searchPlayers, type PlayerPage } from '@/server/dal/players'
import { errorInfo, log } from '@/server/log'
import { canEditOwnPlayerProfile, playersGate } from '@/server/policies/players'
import * as profile from '@/server/services/players/profile'

const profilePath = `${routes.dashboard}/profile`

/** Shared steps of every editor section: viewer, policy, validation, service call, known errors. */
async function runSection<S extends z.ZodType>(
  formData: FormData,
  schema: S,
  save: (userId: string, data: z.output<S>) => Promise<void>,
  extra?: (raw: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => Record<string, unknown>,
): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(profilePath))
  if (!canEditOwnPlayerProfile(viewer)) return { status: 'error', message: messages.notAllowed }

  const raw = formToObject(formData)
  const parsed = schema.safeParse({ ...raw, ...(extra?.(raw) ?? {}) })
  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => save(viewer.user.id, parsed.data))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('player section save failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: messages.saved }
}

const list = (name: string) => (raw: Record<string, FormDataEntryValue | FormDataEntryValue[]>) => ({
  [name]: raw[name] === undefined ? [] : raw[name],
})

export async function saveIdentity(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, identitySchema, profile.updateIdentity)
}

export async function savePlaying(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, playingSchema, profile.updatePlaying, (raw) => ({
    ...list('qualificationIds')(raw),
    skillIds: [...formData.getAll('softSkillIds'), ...formData.getAll('gameSkillIds')],
  }))
}

export async function saveEligibility(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, eligibilitySchema, profile.updateEligibility)
}

export async function saveConditioning(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, conditioningSchema, profile.updateConditioning)
}

export async function saveAcademic(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, academicSchema, profile.updateAcademic)
}

export async function saveClubHistoryEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, clubHistorySchema, profile.saveClubHistory)
}

export async function saveAchievementEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, achievementSchema, profile.saveAchievement)
}

export async function saveHighlightVideo(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, highlightVideoSchema, profile.updateHighlightVideo)
}

export async function saveFeaturedVideoEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, featuredVideoSchema, profile.saveFeaturedVideo)
}

export async function saveSocial(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, socialSchema, profile.updateSocial)
}

export async function saveCv(_prev: FormState, formData: FormData): Promise<FormState> {
  return runSection(formData, cvSchema, profile.updateCv)
}

/** Delete buttons post `kind` and `id`. */
export async function deleteListEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const kind = String(formData.get('kind') ?? '')
  const id = String(formData.get('id') ?? '')
  const handlers: Record<string, (userId: string, id: string) => Promise<void>> = {
    clubHistory: profile.deleteClubHistory,
    achievement: profile.deleteAchievement,
    featuredVideo: profile.deleteFeaturedVideo,
  }
  const handler = handlers[kind]
  if (!handler || !id) return { status: 'error', message: messages.genericError }
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(profilePath))
  if (!canEditOwnPlayerProfile(viewer)) return { status: 'error', message: messages.notAllowed }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => handler(viewer.user.id, id))
  } catch (error) {
    log.error('delete entry failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'Deleted' }
}

export async function submitIdentityDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(profilePath))
  if (!canEditOwnPlayerProfile(viewer)) return { status: 'error', message: messages.notAllowed }
  const fileId = String(formData.get('fileId') ?? '')
  if (!fileId) return { status: 'error', fieldErrors: { fileId: ['Upload your document first.'] } }
  try {
    await runAsUser(viewer.user.id, viewer.role, () => profile.submitIdentityDocument(viewer.user.id, fileId))
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('identity document submit failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'Your document has been sent for review.' }
}

/** Next page for infinite loading. Filters arrive as plain search params. */
export async function loadMorePlayers(params: Record<string, string>, cursor: string): Promise<PlayerPage | null> {
  const viewer = await getViewer()
  if (playersGate(viewer) !== null) return null
  return searchPlayers(parsePlayerFilters(params), cursor)
}
