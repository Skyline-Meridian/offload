import 'server-only'

import type { z } from 'zod'

import type { OrganisationType } from '@/generated/prisma/client'
import { DomainError } from '@/lib/errors'
import type { OrgTypeKey } from '@/lib/constants'
import type { coachSchema, organisationSchema, pathwaySchema, seasonSchema, trainingSessionSchema } from '@/lib/validation/organisation'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { placeExists } from '@/server/integrations/places'
import { notify, staffUserIds } from '@/server/notify'
import { DESCRIPTION_MAX_CHARS, htmlToText, sanitizeDescription } from '@/server/sanitize'

/** Name, country, registration number and document change only after staff approve (03 section 8). */
const REVIEWED_FIELDS = ['name', 'country', 'registrationNumber', 'documentFileId'] as const

type OrganisationInput = Record<string, unknown> & { name: string; country: string; description: string }

async function assertPlace(placeId: unknown, previous: string | null): Promise<void> {
  if (typeof placeId !== 'string' || placeId === '' || placeId === previous) return
  if (!(await placeExists(placeId))) throw new DomainError('bad-place', "We couldn't find this place. Pick it again from the list.")
}

async function assertOwnFile(tx: Tx, fileId: unknown, userId: string, purpose: 'ORGANISATION_LOGO' | 'COACH_IMAGE' | 'ORGANISATION_DOCUMENT'): Promise<void> {
  if (typeof fileId !== 'string' || fileId === '') return
  const file = await tx.file.findUnique({ where: { id: fileId }, select: { ownerId: true, purpose: true, status: true } })
  if (!file || file.purpose !== purpose || file.status !== 'READY') throw new DomainError('bad-file', 'This file cannot be used. Upload it again.')
  // Another manager of the same organisation may have uploaded it; the file must at least belong to a manager.
  if (file.ownerId !== userId) {
    const sameOrg = await tx.organisationMember.findFirst({
      where: { userId: file.ownerId ?? '', status: 'ACTIVE', organisation: { members: { some: { userId, status: 'ACTIVE' } } } },
      select: { id: true },
    })
    if (!sameOrg) throw new DomainError('bad-file', 'This file cannot be used. Upload it again.')
  }
}

/** Saves the main organisation form. Returns true when some changes wait for review. */
export async function updateOrganisation(
  userId: string,
  organisationId: string,
  type: OrgTypeKey,
  input: z.output<ReturnType<typeof organisationSchema>>,
): Promise<{ pendingReview: boolean }> {
  const data = input as OrganisationInput
  const html = sanitizeDescription(data.description)
  if (htmlToText(html).length > DESCRIPTION_MAX_CHARS) {
    throw new DomainError('too-long', `The description can have at most ${DESCRIPTION_MAX_CHARS} characters.`)
  }

  return db.$transaction(async (tx) => {
    const current = await tx.organisation.findUnique({ where: { id: organisationId } })
    if (!current || current.type !== (type as OrganisationType)) throw new DomainError('not-found', 'Organisation not found.')

    await assertPlace(data.placeId, current.placeId)
    await assertPlace(data.trainingGroundPlaceId, current.trainingGroundPlaceId)
    await assertPlace(data.playingGroundPlaceId, current.playingGroundPlaceId)
    await assertOwnFile(tx, data.logoFileId, userId, 'ORGANISATION_LOGO')
    await assertOwnFile(tx, data.documentFileId, userId, 'ORGANISATION_DOCUMENT')

    const published = current.status === 'PUBLISHED'
    const reviewed: Record<string, unknown> = {}
    const incoming: Record<string, unknown> = {
      name: data.name,
      country: data.country,
      registrationNumber: data.registrationNumber ?? null,
      documentFileId: data.documentFileId ?? null,
    }
    if (published) {
      for (const field of REVIEWED_FIELDS) {
        if (field === 'registrationNumber' && !('registrationNumber' in data)) continue
        const before = (current as Record<string, unknown>)[field] ?? null
        if (incoming[field] !== before && incoming[field] !== undefined) reviewed[field] = incoming[field]
      }
    }

    const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
    await tx.organisation.update({
      where: { id: organisationId },
      data: {
        ...(published ? {} : { name: data.name, country: data.country, registrationNumber: str(data.registrationNumber), documentFileId: str(data.documentFileId) }),
        description: html || null,
        logoFileId: str(data.logoFileId),
        officialEmail: str(data.officialEmail),
        officialPhone: str(data.officialPhone),
        website: str(data.website),
        foundedYear: typeof data.foundedYear === 'number' ? data.foundedYear : null,
        addressLine1: str(data.addressLine1),
        addressLine2: str(data.addressLine2),
        city: str(data.city),
        region: str(data.region),
        postcode: str(data.postcode),
        mapAddress: str(data.mapAddress),
        placeId: str(data.placeId),
        facebookUrl: str(data.facebookUrl),
        instagramUrl: str(data.instagramUrl),
        linkedinUrl: str(data.linkedinUrl),
        xUrl: str(data.xUrl),
        youtubeUrl: str(data.youtubeUrl),
        trainingGround: str(data.trainingGround),
        trainingGroundPlaceId: str(data.trainingGround) ? str(data.trainingGroundPlaceId) : null,
        playingGround: str(data.playingGround),
        playingGroundPlaceId: str(data.playingGround) ? str(data.playingGroundPlaceId) : null,
        previousResults: str(data.previousResults),
        level: str(data.level),
        institutionKind: type === 'INSTITUTION' ? (data.institutionKind as 'COLLEGE' | 'UNIVERSITY') : null,
        industryId: type === 'BRAND' ? str(data.industryId) : null,
        industryOther: type === 'BRAND' && data.industryId === 'other' ? str(data.industryOther) : null,
      },
    })

    if (type === 'CLUB' || type === 'UNION') {
      const leagueIds = [...new Set((data.leagueIds as string[] | undefined) ?? [])]
      if (leagueIds.length && (await tx.league.count({ where: { id: { in: leagueIds }, isActive: true } })) !== leagueIds.length) {
        throw new DomainError('bad-reference', 'One of the chosen leagues is not available.')
      }
      await tx.organisationLeague.deleteMany({ where: { organisationId } })
      await tx.organisationLeague.createMany({ data: leagueIds.map((leagueId) => ({ organisationId, leagueId })) })
    }

    // A document added while the organisation is waiting for review goes with the open request.
    const documentId = str(data.documentFileId)
    if (!published && documentId) {
      const request = await tx.verificationRequest.findFirst({
        where: { organisationId, subject: 'ORGANISATION', status: 'PENDING' },
        select: { id: true },
      })
      if (request) {
        await tx.verificationDocument.upsert({
          where: { requestId_fileId: { requestId: request.id, fileId: documentId } },
          create: { requestId: request.id, fileId: documentId },
          update: {},
        })
      }
    }

    let pendingReview = false
    if (Object.keys(reviewed).length > 0) {
      await tx.organisationChangeRequest.updateMany({
        where: { organisationId, status: 'PENDING' },
        data: { status: 'REJECTED', reason: 'Replaced by a newer request' },
      })
      await tx.organisationChangeRequest.create({
        data: { organisationId, requestedById: userId, changes: reviewed as never },
      })
      await notify(tx, {
        userIds: await staffUserIds(tx),
        type: 'organisation.change-requested',
        linkPath: '/dashboard/staff/verification',
        subjectName: current.name,
      })
      pendingReview = true
    }
    await audit(tx, {
      action: 'organisation.updated',
      subjectType: 'Organisation',
      subjectId: organisationId,
      relatedOrgId: organisationId,
      data: { pendingReview },
    })
    return { pendingReview }
  })
}

type Child = 'coach' | 'season' | 'trainingSession' | 'pathway'

async function nextOrder(tx: Tx, child: Child, organisationId: string): Promise<number> {
  const where = { organisationId }
  const result =
    child === 'coach'
      ? await tx.coach.aggregate({ where, _max: { sortOrder: true } })
      : child === 'season'
        ? await tx.season.aggregate({ where, _max: { sortOrder: true } })
        : child === 'trainingSession'
          ? await tx.trainingSession.aggregate({ where, _max: { sortOrder: true } })
          : await tx.clubPathway.aggregate({ where, _max: { sortOrder: true } })
  return (result._max.sortOrder ?? -1) + 1
}

export async function saveCoach(userId: string, organisationId: string, input: z.output<typeof coachSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    await assertOwnFile(tx, input.photoFileId, userId, 'COACH_IMAGE')
    const data = { name: input.name, jobRole: input.jobRole, startDate: input.startDate, endDate: input.endDate ?? null, photoFileId: input.photoFileId ?? null }
    if (input.id) {
      const result = await tx.coach.updateMany({ where: { id: input.id, organisationId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      await tx.coach.create({ data: { organisationId, ...data, sortOrder: await nextOrder(tx, 'coach', organisationId) } })
    }
  })
}

export async function saveSeason(organisationId: string, input: z.output<typeof seasonSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const data = { label: input.label, startDate: input.startDate, endDate: input.endDate }
    if (input.id) {
      const result = await tx.season.updateMany({ where: { id: input.id, organisationId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      await tx.season.create({ data: { organisationId, ...data, sortOrder: await nextOrder(tx, 'season', organisationId) } })
    }
  })
}

export async function saveTrainingSession(organisationId: string, input: z.output<typeof trainingSessionSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const data = { day: input.day, startTime: input.startTime, endTime: input.endTime }
    if (input.id) {
      const result = await tx.trainingSession.updateMany({ where: { id: input.id, organisationId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      await tx.trainingSession.create({ data: { organisationId, ...data, sortOrder: await nextOrder(tx, 'trainingSession', organisationId) } })
    }
  })
}

export async function savePathway(organisationId: string, input: z.output<typeof pathwaySchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    if (input.institutionId) {
      const institution = await tx.organisation.findFirst({ where: { id: input.institutionId, type: 'INSTITUTION', status: 'PUBLISHED' }, select: { id: true } })
      if (!institution) throw new DomainError('bad-reference', 'The chosen institution is not available.')
    }
    const data = { institutionId: input.institutionId ?? null, institutionText: input.institutionId ? null : (input.institutionText ?? null) }
    if (input.id) {
      const result = await tx.clubPathway.updateMany({ where: { id: input.id, organisationId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      await tx.clubPathway.create({ data: { organisationId, ...data, sortOrder: await nextOrder(tx, 'pathway', organisationId) } })
    }
  })
}

export async function deleteChild(organisationId: string, kind: Child, id: string): Promise<void> {
  const where = { id, organisationId }
  if (kind === 'coach') await db.coach.deleteMany({ where })
  else if (kind === 'season') await db.season.deleteMany({ where })
  else if (kind === 'trainingSession') await db.trainingSession.deleteMany({ where })
  else await db.clubPathway.deleteMany({ where })
}

/** A rejected organisation is sent for review again (03 section 8). */
export async function resubmitOrganisation(userId: string, organisationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const org = await tx.organisation.findUnique({ where: { id: organisationId }, select: { status: true, name: true } })
    if (!org || org.status !== 'REJECTED') throw new DomainError('bad-state', 'This organisation cannot be sent for review.')
    await tx.organisation.update({ where: { id: organisationId }, data: { status: 'PENDING', statusReason: null } })
    await tx.verificationRequest.updateMany({
      where: { organisationId, subject: 'ORGANISATION', status: 'PENDING' },
      data: { status: 'SUPERSEDED', decidedAt: new Date() },
    })
    const request = await tx.verificationRequest.create({ data: { subject: 'ORGANISATION', organisationId } })
    await audit(tx, {
      action: 'organisation.resubmitted',
      subjectType: 'VerificationRequest',
      subjectId: request.id,
      relatedUserIds: [userId],
      relatedOrgId: organisationId,
    })
    await notify(tx, { userIds: await staffUserIds(tx), type: 'verification.organisation-pending', linkPath: '/dashboard/staff/verification', subjectName: org.name })
  })
}
