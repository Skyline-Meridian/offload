import 'server-only'

import type { z } from 'zod'

import type { FilePurpose } from '@/generated/prisma/client'
import { DomainError } from '@/lib/errors'
import type {
  academicSchema,
  achievementSchema,
  clubHistorySchema,
  conditioningSchema,
  cvSchema,
  eligibilitySchema,
  featuredVideoSchema,
  highlightVideoSchema,
  identitySchema,
  playingSchema,
  socialSchema,
} from '@/lib/validation/player'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'

type Out<T extends z.ZodType> = z.output<T>

async function profileIdFor(tx: Tx, userId: string): Promise<string> {
  const profile = await tx.playerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) throw new DomainError('no-profile', 'Player profile not found.')
  return profile.id
}

/** A file the user uploaded themselves, finished processing, for the expected purpose. */
async function assertOwnFile(tx: Tx, fileId: string, userId: string, purpose: FilePurpose): Promise<void> {
  const file = await tx.file.findUnique({ where: { id: fileId }, select: { ownerId: true, purpose: true, status: true } })
  if (!file || file.ownerId !== userId || file.purpose !== purpose || file.status !== 'READY') {
    throw new DomainError('bad-file', 'This file cannot be used. Upload it again.')
  }
}

async function assertAllExist(tx: Tx, table: 'position' | 'qualification' | 'skill', ids: string[]): Promise<void> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return
  const found =
    table === 'position'
      ? await tx.position.count({ where: { id: { in: unique }, isActive: true } })
      : table === 'qualification'
        ? await tx.qualification.count({ where: { id: { in: unique }, isActive: true } })
        : await tx.skill.count({ where: { id: { in: unique }, isActive: true } })
  if (found !== unique.length) throw new DomainError('bad-reference', 'One of the chosen options is not available.')
}

async function assertCountries(tx: Tx, codes: string[]): Promise<void> {
  const unique = [...new Set(codes)]
  if (unique.length === 0) return
  if ((await tx.country.count({ where: { code: { in: unique } } })) !== unique.length) {
    throw new DomainError('bad-reference', 'One of the chosen countries is not available.')
  }
}

async function assertOrganisation(tx: Tx, id: string | undefined, type: 'CLUB' | 'UNION' | 'INSTITUTION'): Promise<void> {
  if (!id) return
  const org = await tx.organisation.findFirst({ where: { id, status: 'PUBLISHED', type }, select: { id: true } })
  if (!org) throw new DomainError('bad-reference', 'The chosen organisation is not available.')
}

export async function updateIdentity(userId: string, input: Out<typeof identitySchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    await profileIdFor(tx, userId)
    await assertCountries(tx, input.nationalities)
    if (input.profilePictureId) await assertOwnFile(tx, input.profilePictureId, userId, 'PROFILE_PICTURE')
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        name: `${input.firstName} ${input.lastName}`,
        dateOfBirth: input.dateOfBirth,
        nationalities: input.nationalities,
        personalPhone: input.personalPhone ?? null,
        bio: input.bio ?? null,
        profilePictureId: input.profilePictureId ?? null,
      },
    })
  })
}

export async function updatePlaying(userId: string, input: Out<typeof playingSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    const positions = [input.primaryPositionId, input.secondaryPositionId, input.otherPositionId].filter((p): p is string => Boolean(p))
    await assertAllExist(tx, 'position', positions)
    await assertAllExist(tx, 'qualification', input.qualificationIds)
    await assertAllExist(tx, 'skill', input.skillIds)
    if (input.highestQualification) await assertAllExist(tx, 'qualification', [input.highestQualification])
    await assertOrganisation(tx, input.currentClubId, 'CLUB')
    await assertOrganisation(tx, input.currentUnionId, 'UNION')
    await assertOrganisation(tx, input.currentInstitutionId, 'INSTITUTION')

    // The organisation link and the typed text are alternatives: the link wins and clears the text.
    await tx.playerProfile.update({
      where: { id: playerId },
      data: {
        primaryPositionId: input.primaryPositionId ?? null,
        secondaryPositionId: input.secondaryPositionId ?? null,
        otherPositionId: input.otherPositionId ?? null,
        heightCm: input.heightCm ?? null,
        weightKg: input.weightKg ?? null,
        currentClubId: input.currentClubId ?? null,
        currentClubText: input.currentClubId ? null : (input.currentClubText ?? null),
        currentUnionId: input.currentUnionId ?? null,
        currentUnionText: input.currentUnionId ? null : (input.currentUnionText ?? null),
        currentInstitutionId: input.currentInstitutionId ?? null,
        currentInstitutionText: input.currentInstitutionId ? null : (input.currentInstitutionText ?? null),
        contractEndDate: input.contractEndDate ?? null,
        rugbyCode: input.rugbyCode ?? null,
        highestQualification: input.highestQualification ?? null,
        isKeenToRelocate: input.isKeenToRelocate,
        isRetired: input.isRetired,
        isOpenToBrandPartnership: input.isOpenToBrandPartnership,
        strengths: input.strengths ?? null,
        workOns: input.workOns ?? null,
        colourPersonality: input.colourPersonality ?? null,
      },
    })
    await tx.playerQualification.deleteMany({ where: { playerId } })
    await tx.playerQualification.createMany({
      data: [...new Set(input.qualificationIds)].map((qualificationId) => ({ playerId, qualificationId })),
    })
    await tx.playerSkill.deleteMany({ where: { playerId } })
    await tx.playerSkill.createMany({ data: [...new Set(input.skillIds)].map((skillId) => ({ playerId, skillId })) })
  })
}

export async function updateEligibility(userId: string, input: Out<typeof eligibilitySchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await assertCountries(tx, [...input.eligibleCountries, ...input.cappedCountries])
    // Cap details are kept only while the player is capped.
    await tx.playerProfile.update({
      where: { id: playerId },
      data: {
        isCapped: input.isCapped,
        firstCap: input.isCapped ? (input.firstCap ?? null) : null,
        lastCap: input.isCapped ? (input.lastCap ?? null) : null,
        totalCaps: input.isCapped ? (input.totalCaps ?? null) : null,
      },
    })
    await tx.playerCountry.deleteMany({ where: { playerId } })
    await tx.playerCountry.createMany({
      data: [
        ...[...new Set(input.eligibleCountries)].map((country) => ({ playerId, country, kind: 'ELIGIBLE' as const })),
        ...(input.isCapped ? [...new Set(input.cappedCountries)].map((country) => ({ playerId, country, kind: 'CAPPED' as const })) : []),
      ],
    })
    await tx.playerAgeGroup.deleteMany({ where: { playerId } })
    if (input.isCapped) {
      await tx.playerAgeGroup.createMany({ data: [...new Set(input.ageGroups)].map((ageGroup) => ({ playerId, ageGroup })) })
    }
  })
}

export async function updateConditioning(userId: string, input: Out<typeof conditioningSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.playerProfile.update({
      where: { id: playerId },
      data: {
        maxSpeedMs: input.maxSpeedMs ?? null,
        broadJumpCm: input.broadJumpCm ?? null,
        test1200Sec: input.test1200Sec ?? null,
        cmjCm: input.cmjCm ?? null,
        bench1rmKg: input.bench1rmKg ?? null,
        squat1rmKg: input.squat1rmKg ?? null,
      },
    })
  })
}

export async function updateAcademic(userId: string, input: Out<typeof academicSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.playerProfile.update({ where: { id: playerId }, data: input })
  })
}

export async function saveClubHistory(userId: string, input: Out<typeof clubHistorySchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    const data = {
      clubName: input.clubName,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      coaches: input.coaches ?? null,
    }
    if (input.id) {
      const result = await tx.clubHistory.updateMany({ where: { id: input.id, playerId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      await tx.clubHistory.create({ data: { playerId, ...data } })
    }
  })
}

export async function deleteClubHistory(userId: string, id: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.clubHistory.deleteMany({ where: { id, playerId } })
  })
}

export async function saveAchievement(userId: string, input: Out<typeof achievementSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    const data = { title: input.title, year: input.year ?? null }
    if (input.id) {
      const result = await tx.achievement.updateMany({ where: { id: input.id, playerId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      await tx.achievement.create({ data: { playerId, ...data } })
    }
  })
}

export async function deleteAchievement(userId: string, id: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.achievement.deleteMany({ where: { id, playerId } })
  })
}

export async function updateHighlightVideo(userId: string, input: Out<typeof highlightVideoSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.playerProfile.update({ where: { id: playerId }, data: { highlightVideoUrl: input.highlightVideoUrl ?? null } })
  })
}

export async function saveFeaturedVideo(userId: string, input: Out<typeof featuredVideoSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    const data = { youtubeUrl: input.youtubeUrl, howToIdentify: input.howToIdentify ?? null }
    if (input.id) {
      const result = await tx.featuredVideo.updateMany({ where: { id: input.id, playerId }, data })
      if (result.count === 0) throw new DomainError('not-found', 'Entry not found.')
    } else {
      const last = await tx.featuredVideo.aggregate({ where: { playerId }, _max: { sortOrder: true } })
      await tx.featuredVideo.create({ data: { playerId, ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } })
    }
  })
}

export async function deleteFeaturedVideo(userId: string, id: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.featuredVideo.deleteMany({ where: { id, playerId } })
  })
}

export async function updateSocial(userId: string, input: Out<typeof socialSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    await tx.playerProfile.update({
      where: { id: playerId },
      data: {
        instagramUrl: input.instagramUrl ?? null,
        youtubeUrl: input.youtubeUrl ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        facebookUrl: input.facebookUrl ?? null,
        xUrl: input.xUrl ?? null,
      },
    })
  })
}

export async function updateCv(userId: string, input: Out<typeof cvSchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const playerId = await profileIdFor(tx, userId)
    if (input.cvFileId) await assertOwnFile(tx, input.cvFileId, userId, 'CV')
    await tx.playerProfile.update({ where: { id: playerId }, data: { cvFileId: input.cvFileId ?? null } })
  })
}

/** PLR-7: sends the identity document for review (design 02 section 5.4). */
export async function submitIdentityDocument(userId: string, fileId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { isEmailVerified: true, documentStatus: true } })
    if (!user) throw new DomainError('not-found', 'User not found.')
    if (!user.isEmailVerified) throw new DomainError('email-unverified', 'Verify your email first.')
    if (user.documentStatus === 'VERIFIED') throw new DomainError('already-verified', 'Your identity is already verified.')
    await assertOwnFile(tx, fileId, userId, 'IDENTITY_DOCUMENT')

    await tx.verificationRequest.updateMany({
      where: { userId, subject: 'PLAYER', status: 'PENDING' },
      data: { status: 'SUPERSEDED', decidedAt: new Date() },
    })
    const request = await tx.verificationRequest.create({
      data: { subject: 'PLAYER', userId, documents: { create: { fileId } } },
    })
    await tx.user.update({ where: { id: userId }, data: { documentStatus: 'AWAITING_REVIEW' } })
    await audit(tx, {
      action: 'verification.submitted',
      subjectType: 'VerificationRequest',
      subjectId: request.id,
      relatedUserIds: [userId],
      data: { subject: 'PLAYER' },
    })
  })
}
