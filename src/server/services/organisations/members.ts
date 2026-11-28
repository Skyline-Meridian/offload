import 'server-only'

import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { notifyRealtime } from '@/server/realtime-notify'

/** Managers who get notifications: active members who are active, email-verified and identity-verified. */
export async function managersToNotify(tx: Tx, organisationId: string): Promise<string[]> {
  const members = await tx.organisationMember.findMany({
    where: {
      organisationId,
      status: 'ACTIVE',
      user: { status: 'ACTIVE', isEmailVerified: true, documentStatus: 'VERIFIED' },
    },
    select: { userId: true },
  })
  return members.map((m) => m.userId)
}

/** Locks the organisation row and refuses when the user is the last verified active manager. */
export async function assertNotLastVerifiedManager(tx: Tx, organisationId: string, leavingUserId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Organisation" WHERE "id" = ${organisationId}::uuid FOR UPDATE`
  const others = await tx.organisationMember.count({
    where: {
      organisationId,
      status: 'ACTIVE',
      userId: { not: leavingUserId },
      user: { status: 'ACTIVE', isEmailVerified: true, documentStatus: 'VERIFIED' },
    },
  })
  if (others === 0) {
    throw new DomainError(
      'LAST_MANAGER',
      'An organisation needs at least one verified manager. Ask Offload to add another manager before you leave.',
    )
  }
}

/** A manager leaves their organisation. Their identity verification no longer applies (03 section 9). */
export async function removeOrganisationFromProfile(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const member = await tx.organisationMember.findFirst({
      where: { userId, status: { in: ['PENDING', 'ACTIVE'] } },
      select: { id: true, organisationId: true, status: true },
    })
    if (!member) throw new DomainError('no-membership', 'You are not a member of an organisation.')
    if (member.status === 'ACTIVE') await assertNotLastVerifiedManager(tx, member.organisationId, userId)
    await tx.organisationMember.update({ where: { id: member.id }, data: { status: 'REMOVED' } })
    await tx.user.update({ where: { id: userId }, data: { documentStatus: 'NONE' } })
    await notifyRealtime(tx, { type: 'membership.changed', userId })
    await audit(tx, {
      action: 'membership.left',
      subjectType: 'Organisation',
      subjectId: member.organisationId,
      relatedUserIds: [userId],
      relatedOrgId: member.organisationId,
    })
  })
}
