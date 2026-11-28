import 'server-only'

import type { z } from 'zod'

import { DomainError } from '@/lib/errors'
import type { identitySchema } from '@/lib/validation/player'
import { audit } from '@/server/audit'
import { db } from '@/server/db'
import { notify, staffUserIds } from '@/server/notify'

/** The manager's own details. Same fields as a player's identity section. */
export async function updateManagerIdentity(userId: string, input: z.output<typeof identitySchema>): Promise<void> {
  await db.$transaction(async (tx) => {
    const countries = [...new Set(input.nationalities)]
    if ((await tx.country.count({ where: { code: { in: countries } } })) !== countries.length) {
      throw new DomainError('bad-reference', 'One of the chosen countries is not available.')
    }
    if (input.profilePictureId) {
      const file = await tx.file.findUnique({ where: { id: input.profilePictureId }, select: { ownerId: true, purpose: true, status: true } })
      if (!file || file.ownerId !== userId || file.purpose !== 'PROFILE_PICTURE' || file.status !== 'READY') {
        throw new DomainError('bad-file', 'This file cannot be used. Upload it again.')
      }
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        name: `${input.firstName} ${input.lastName}`,
        dateOfBirth: input.dateOfBirth,
        nationalities: countries,
        personalPhone: input.personalPhone ?? null,
        bio: input.bio ?? null,
        profilePictureId: input.profilePictureId ?? null,
      },
    })
  })
}

/** GEN-3.8: a manager sends an identity document. It goes with the current membership. */
export async function submitManagerDocument(userId: string, fileId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { isEmailVerified: true, documentStatus: true, firstName: true } })
    if (!user) throw new DomainError('not-found', 'User not found.')
    if (!user.isEmailVerified) throw new DomainError('email-unverified', 'Verify your email first.')
    if (user.documentStatus === 'VERIFIED') throw new DomainError('already-verified', 'Your identity is already verified.')
    const member = await tx.organisationMember.findFirst({
      where: { userId, status: { in: ['PENDING', 'ACTIVE'] } },
      select: { id: true, organisationId: true, source: true, organisation: { select: { name: true } } },
    })
    if (!member) throw new DomainError('no-membership', 'Add or claim an organisation first.')
    const file = await tx.file.findUnique({ where: { id: fileId }, select: { ownerId: true, purpose: true, status: true } })
    if (!file || file.ownerId !== userId || file.purpose !== 'IDENTITY_DOCUMENT' || file.status !== 'READY') {
      throw new DomainError('bad-file', 'This file cannot be used. Upload it again.')
    }
    await tx.verificationRequest.updateMany({
      where: { userId, subject: 'MANAGER', status: 'PENDING' },
      data: { status: 'SUPERSEDED', decidedAt: new Date() },
    })
    const request = await tx.verificationRequest.create({
      data: {
        subject: 'MANAGER',
        userId,
        organisationId: member.organisationId,
        membershipId: member.id,
        isClaim: member.source === 'CLAIM',
        documents: { create: { fileId } },
      },
    })
    await tx.user.update({ where: { id: userId }, data: { documentStatus: 'AWAITING_REVIEW' } })
    await audit(tx, {
      action: 'verification.submitted',
      subjectType: 'VerificationRequest',
      subjectId: request.id,
      relatedUserIds: [userId],
      relatedOrgId: member.organisationId,
      data: { subject: 'MANAGER' },
    })
    await notify(tx, {
      userIds: await staffUserIds(tx),
      type: 'verification.manager-pending',
      linkPath: '/dashboard/staff/verification',
      subjectName: member.organisation.name,
    })
  })
}
