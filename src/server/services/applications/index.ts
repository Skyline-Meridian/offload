import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { notify } from '@/server/notify'
import { canApply } from '@/server/policies/offers'
import type { Viewer } from '@/server/dal/viewer'
import { hasActiveSubscription } from '@/server/services/billing/entitlement'
import { managersToNotify } from '@/server/services/organisations/members'

const ALREADY_APPLIED = 'You have already applied'

/** A player applies to a published offer (04 section 4.1). Safe against two simultaneous submits. */
export async function applyToOffer(viewer: Viewer, offerId: string, note: string | undefined): Promise<void> {
  try {
    await db.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        select: { id: true, title: true, status: true, expiresAt: true, organisationId: true, organisation: { select: { status: true } } },
      })
      if (!offer || !canApply(viewer, { status: offer.status, expiresAt: offer.expiresAt, organisationStatus: offer.organisation.status })) {
        throw new DomainError('cannot-apply', 'You cannot apply to this offer.')
      }
      const profile = await tx.playerProfile.findUnique({ where: { userId: viewer.user.id }, select: { id: true } })
      if (!profile) throw new DomainError('no-profile', 'Player profile not found.')

      const existing = await tx.application.findUnique({ where: { offerId_playerId: { offerId, playerId: profile.id } } })
      if (existing && existing.status !== 'WITHDRAWN') throw new DomainError('already-applied', ALREADY_APPLIED)

      if (existing) {
        await tx.application.update({
          where: { id: existing.id },
          data: { status: 'SUBMITTED', note: note ?? null, resubmittedAt: new Date(), statusChangedAt: null, statusChangedById: null },
        })
      } else {
        await tx.application.create({
          data: { offerId, playerId: profile.id, organisationId: offer.organisationId, note: note ?? null },
        })
      }

      const subscribed = await hasActiveSubscription(offer.organisationId)
      await notify(tx, {
        userIds: await managersToNotify(tx, offer.organisationId),
        type: subscribed ? 'application.new' : 'application.new_locked',
        linkPath: subscribed ? '/dashboard/applications' : '/pricing',
        subjectName: offer.title ?? 'Offer',
      })
      await audit(tx, { action: 'application.submitted', subjectType: 'Offer', subjectId: offerId, relatedUserIds: [viewer.user.id], relatedOrgId: offer.organisationId })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new DomainError('already-applied', ALREADY_APPLIED)
    }
    throw error
  }
}

export async function withdrawApplication(userId: string, applicationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const application = await tx.application.findFirst({ where: { id: applicationId, player: { userId } } })
    if (!application) throw new DomainError('not-found', 'Application not found.')
    if (application.status === 'WITHDRAWN') return
    await tx.application.update({ where: { id: applicationId }, data: { status: 'WITHDRAWN', statusChangedAt: new Date(), statusChangedById: userId } })
  })
}

/** A manager moves an application to shortlisted, contacted or rejected and the player is told. */
export async function setApplicationStatus(
  viewer: Viewer,
  applicationId: string,
  status: 'SHORTLISTED' | 'CONTACTED' | 'REJECTED',
): Promise<void> {
  const organisationId = viewer.organisation?.id
  if (!organisationId) throw new DomainError('not-allowed', 'You cannot do this.')
  await db.$transaction(async (tx) => {
    const application = await tx.application.findFirst({
      where: { id: applicationId, organisationId },
      select: { id: true, status: true, offer: { select: { title: true } }, player: { select: { userId: true } } },
    })
    if (!application) throw new DomainError('not-found', 'Application not found.')
    if (application.status === 'WITHDRAWN') throw new DomainError('withdrawn', 'The player has withdrawn this application.')
    await tx.application.update({
      where: { id: applicationId },
      data: { status, statusChangedAt: new Date(), statusChangedById: viewer.user.id },
    })
    await notify(tx, {
      userIds: [application.player.userId],
      type: 'application.status',
      linkPath: '/dashboard/my-applications',
      subjectName: application.offer.title ?? 'Offer',
    })
    await audit(tx, { action: 'application.status', subjectType: 'Application', subjectId: applicationId, relatedUserIds: [application.player.userId], relatedOrgId: organisationId, data: { status } })
  })
}

/** Called when a player is suspended or deleted: open applications are withdrawn (04 section 4.2). */
export async function withdrawOpenApplicationsFor(tx: Tx, userId: string): Promise<void> {
  await tx.application.updateMany({
    where: { player: { userId }, status: { in: ['SUBMITTED', 'SHORTLISTED', 'CONTACTED'] } },
    data: { status: 'WITHDRAWN', statusChangedAt: new Date() },
  })
}

