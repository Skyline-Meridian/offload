import 'server-only'

import { DomainError } from '@/lib/errors'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { notify } from '@/server/notify'
import { pauseForOrganisation, resumeForOrganisation, syncAfterResume } from '@/server/services/billing/lifecycle'
import { managersToNotify } from '@/server/services/organisations/members'
import { storage } from '@/server/storage'

async function load(tx: Tx, organisationId: string) {
  const org = await tx.organisation.findFirst({ where: { id: organisationId, deletedAt: null }, select: { id: true, name: true, status: true, slug: true, type: true } })
  if (!org) throw new DomainError('not-found', 'Organisation not found.')
  return org
}

export async function unpublishOrganisation(organisationId: string, reason: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const org = await load(tx, organisationId)
    if (org.status !== 'PUBLISHED') throw new DomainError('bad-state', 'Only a published organisation can be unpublished.')
    await tx.organisation.update({ where: { id: organisationId }, data: { status: 'UNPUBLISHED', statusReason: reason } })
    // The Stripe call runs before the commit: if it fails, the organisation stays published.
    await pauseForOrganisation(tx, organisationId)
    await notify(tx, { userIds: await managersToNotify(tx, organisationId), type: 'organisation.unpublished', linkPath: '/dashboard/organisation', subjectName: org.name })
    await audit(tx, { action: 'organisation.unpublished', subjectType: 'Organisation', subjectId: organisationId, relatedOrgId: organisationId, data: { reason } })
  })
}

export async function republishOrganisation(organisationId: string): Promise<void> {
  await republishInTransaction(organisationId)
  await syncAfterResume(organisationId)
}

async function republishInTransaction(organisationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const org = await load(tx, organisationId)
    if (org.status !== 'UNPUBLISHED') throw new DomainError('bad-state', 'Only an unpublished organisation can be published again.')
    await tx.organisation.update({ where: { id: organisationId }, data: { status: 'PUBLISHED', statusReason: null } })
    await resumeForOrganisation(tx, organisationId)
    await notify(tx, { userIds: await managersToNotify(tx, organisationId), type: 'organisation.republished', linkPath: '/dashboard/organisation', subjectName: org.name })
    await audit(tx, { action: 'organisation.republished', subjectType: 'Organisation', subjectId: organisationId, relatedOrgId: organisationId })
  })
}

/** Keeps the name, removes everything else that was public, and deletes the files after commit (03 section 11). */
export async function deleteOrganisation(organisationId: string): Promise<void> {
  const fileIds = await db.$transaction(async (tx) => {
    const org = await load(tx, organisationId)
    // SUB-8.8: an organisation with a live subscription (even paused, or set to cancel at period end) cannot be deleted.
    const live = await tx.subscription.findFirst({ where: { organisationId, status: { not: 'ENDED' } }, select: { id: true } })
    if (live) {
      throw new DomainError('has-subscription', `This organisation still has a subscription (${live.id}). Cancel it now first.`)
    }
    const coaches = await tx.coach.findMany({ where: { organisationId }, select: { photoFileId: true } })
    const full = await tx.organisation.findUniqueOrThrow({ where: { id: organisationId }, select: { logoFileId: true, documentFileId: true } })
    const files = [full.logoFileId, full.documentFileId, ...coaches.map((c) => c.photoFileId)].filter((f): f is string => Boolean(f))

    await tx.coach.deleteMany({ where: { organisationId } })
    await tx.season.deleteMany({ where: { organisationId } })
    await tx.trainingSession.deleteMany({ where: { organisationId } })
    await tx.organisationLeague.deleteMany({ where: { organisationId } })
    await tx.clubPathway.deleteMany({ where: { organisationId } })
    await tx.organisationMember.updateMany({ where: { organisationId, status: { in: ['PENDING', 'ACTIVE'] } }, data: { status: 'REMOVED' } })
    await tx.organisation.update({
      where: { id: organisationId },
      data: {
        deletedAt: new Date(),
        status: 'UNPUBLISHED',
        description: null,
        logoFileId: null,
        officialEmail: null,
        officialPhone: null,
        website: null,
        foundedYear: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        region: null,
        postcode: null,
        mapAddress: null,
        placeId: null,
        facebookUrl: null,
        linkedinUrl: null,
        instagramUrl: null,
        xUrl: null,
        youtubeUrl: null,
        registrationNumber: null,
        trainingGround: null,
        trainingGroundPlaceId: null,
        playingGround: null,
        playingGroundPlaceId: null,
        previousResults: null,
        level: null,
        documentFileId: null,
      },
    })
    await audit(tx, { action: 'organisation.deleted', subjectType: 'Organisation', subjectId: organisationId, relatedOrgId: organisationId, data: { slug: org.slug } })
    return files
  })

  // Files go after the data is committed. A failure here leaves an orphan the cleanup job can find; it is not an error for the user.
  for (const id of fileIds) {
    const file = await db.file.findUnique({ where: { id }, select: { bucket: true, key: true, variants: true } })
    if (!file) continue
    const keys = file.variants.length ? file.variants.map((v) => `${file.key}/${v}.webp`) : [file.key]
    for (const key of keys) await storage.remove(file.bucket === 'content' ? 'content' : 'uploads', key).catch(() => undefined)
    await db.file.delete({ where: { id } }).catch(() => undefined)
  }
}
