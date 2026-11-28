import 'server-only'

import { addDays } from 'date-fns'

import { DomainError } from '@/lib/errors'
import type { OfferDraftInput, OfferPublishInput } from '@/lib/validation/offer'
import { offerPublishSchema } from '@/lib/validation/offer'
import { audit } from '@/server/audit'
import { db, type Tx } from '@/server/db'
import { placeExists } from '@/server/integrations/places'
import { notify } from '@/server/notify'
import { managersToNotify } from '@/server/services/organisations/members'
import { DESCRIPTION_MAX_CHARS, htmlToText, sanitizeDescription } from '@/server/sanitize'

export const OFFER_LIFETIME_DAYS = 30

async function ownOffer(tx: Tx, organisationId: string, offerId: string) {
  const offer = await tx.offer.findFirst({ where: { id: offerId, organisationId } })
  if (!offer) throw new DomainError('not-found', 'Offer not found.')
  return offer
}

async function assertReferences(tx: Tx, positionIds: string[], skillIds: string[]): Promise<void> {
  const positions = [...new Set(positionIds)]
  const skills = [...new Set(skillIds)]
  if (positions.length && (await tx.position.count({ where: { id: { in: positions }, isActive: true } })) !== positions.length) {
    throw new DomainError('bad-reference', 'One of the chosen positions is not available.')
  }
  if (skills.length && (await tx.skill.count({ where: { id: { in: skills }, isActive: true } })) !== skills.length) {
    throw new DomainError('bad-reference', 'One of the chosen skills is not available.')
  }
}

function cleanDescription(html: string): string {
  const clean = sanitizeDescription(html)
  if (htmlToText(clean).length > DESCRIPTION_MAX_CHARS) {
    throw new DomainError('too-long', `The description can have at most ${DESCRIPTION_MAX_CHARS} characters.`)
  }
  return htmlToText(clean) ? clean : ''
}

async function writeRelations(tx: Tx, offerId: string, positionIds: string[], skillIds: string[]): Promise<void> {
  await tx.offerPosition.deleteMany({ where: { offerId } })
  await tx.offerPosition.createMany({ data: [...new Set(positionIds)].map((positionId) => ({ offerId, positionId })) })
  await tx.offerSkill.deleteMany({ where: { offerId } })
  await tx.offerSkill.createMany({ data: [...new Set(skillIds)].map((skillId) => ({ offerId, skillId })) })
}

type Context = { organisationId: string; offeredBy: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND'; userId: string }

/** Creates or updates a draft. The location defaults to the organisation's address. */
export async function saveDraft(ctx: Context, input: OfferDraftInput, offerId?: string): Promise<string> {
  const description = cleanDescription(input.description)
  return db.$transaction(async (tx) => {
    await assertReferences(tx, input.positionIds, input.skillIds)
    if (input.locationPlaceId) {
      if (!(await placeExists(input.locationPlaceId))) throw new DomainError('bad-place', "We couldn't find this place. Pick it again from the list.")
    }
    let id = offerId
    if (offerId) {
      const existing = await ownOffer(tx, ctx.organisationId, offerId)
      if (existing.status !== 'DRAFT' && existing.status !== 'PENDING') throw new DomainError('bad-state', 'Only a draft can be saved as a draft.')
    }
    const base = {
      title: input.title ?? null,
      description: description || null,
      paid: input.paid ?? null,
      locationText: input.locationText ?? null,
      locationPlaceId: input.locationText ? (input.locationPlaceId ?? null) : null,
    }
    if (id) {
      await tx.offer.update({ where: { id }, data: base })
    } else {
      const org = await tx.organisation.findUniqueOrThrow({ where: { id: ctx.organisationId }, select: { mapAddress: true, placeId: true } })
      const created = await tx.offer.create({
        data: {
          ...base,
          organisationId: ctx.organisationId,
          offeredBy: ctx.offeredBy,
          locationText: base.locationText ?? org.mapAddress,
          locationPlaceId: base.locationText ? base.locationPlaceId : org.placeId,
        },
      })
      id = created.id
    }
    await writeRelations(tx, id, input.positionIds, input.skillIds)
    return id
  })
}

/** Publishes a draft (saving the given values first). The expiry date is set once and never changed. */
export async function publish(ctx: Context, input: OfferPublishInput, offerId?: string): Promise<string> {
  const parsed = offerPublishSchema.parse(input)
  const id = await saveDraft(ctx, { ...parsed, title: parsed.title, description: parsed.description }, offerId)
  await db.$transaction(async (tx) => {
    const offer = await ownOffer(tx, ctx.organisationId, id)
    if (offer.status === 'PUBLISHED') return
    const now = new Date()
    await tx.offer.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: now, expiresAt: addDays(now, OFFER_LIFETIME_DAYS) },
    })
    await audit(tx, { action: 'offer.published', subjectType: 'Offer', subjectId: id, relatedOrgId: ctx.organisationId })
  })
  return id
}

/** Edits a draft, pending or published offer. A published offer must still be complete. Dates never change. */
export async function updateOffer(ctx: Context, offerId: string, input: OfferDraftInput): Promise<void> {
  const current = await db.offer.findFirst({ where: { id: offerId, organisationId: ctx.organisationId }, select: { status: true } })
  if (!current) throw new DomainError('not-found', 'Offer not found.')
  if (!['DRAFT', 'PENDING', 'PUBLISHED'].includes(current.status)) throw new DomainError('bad-state', 'This offer can no longer be edited.')
  if (current.status === 'PUBLISHED') {
    const complete = offerPublishSchema.safeParse(input)
    if (!complete.success) throw new DomainError('incomplete', 'A published offer needs a title, description and paid status.')
  }
  const description = cleanDescription(input.description)
  await db.$transaction(async (tx) => {
    await assertReferences(tx, input.positionIds, input.skillIds)
    if (input.locationPlaceId && !(await placeExists(input.locationPlaceId))) {
      throw new DomainError('bad-place', "We couldn't find this place. Pick it again from the list.")
    }
    await tx.offer.update({
      where: { id: offerId },
      data: {
        title: input.title ?? null,
        description: description || null,
        paid: input.paid ?? null,
        locationText: input.locationText ?? null,
        locationPlaceId: input.locationText ? (input.locationPlaceId ?? null) : null,
      },
    })
    await writeRelations(tx, offerId, input.positionIds, input.skillIds)
  })
}

export async function closeOffer(ctx: Context, offerId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const offer = await ownOffer(tx, ctx.organisationId, offerId)
    if (offer.status !== 'PUBLISHED') throw new DomainError('bad-state', 'Only a published offer can be closed.')
    await tx.offer.update({ where: { id: offerId }, data: { status: 'CLOSED', closedAt: new Date() } })
    await audit(tx, { action: 'offer.closed', subjectType: 'Offer', subjectId: offerId, relatedOrgId: ctx.organisationId })
  })
}

/** Staff close an offer that breaks the terms (05). The managers are told why. */
export async function closeOfferForViolation(staffUserId: string, offerId: string, reason: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const offer = await tx.offer.findUnique({ where: { id: offerId } })
    if (!offer) throw new DomainError('not-found', 'Offer not found.')
    if (offer.status !== 'PUBLISHED') throw new DomainError('bad-state', 'Only a published offer can be closed.')
    await tx.offer.update({
      where: { id: offerId },
      data: { status: 'CLOSED', closedAt: new Date(), closedByStaffId: staffUserId, closedReason: reason },
    })
    await notify(tx, {
      userIds: await managersToNotify(tx, offer.organisationId),
      type: 'offer.closed_by_staff',
      linkPath: '/dashboard/offers',
      subjectName: offer.title ?? 'Offer',
    })
    await audit(tx, { action: 'offer.closed-by-staff', subjectType: 'Offer', subjectId: offerId, relatedOrgId: offer.organisationId, data: { reason } })
  })
}

export async function deleteOffer(ctx: Context, offerId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await ownOffer(tx, ctx.organisationId, offerId)
    if ((await tx.application.count({ where: { offerId } })) > 0) {
      throw new DomainError('has-applications', "This offer has applications, so it can't be deleted. Close it instead.")
    }
    await tx.offer.delete({ where: { id: offerId } })
    await audit(tx, { action: 'offer.deleted', subjectType: 'Offer', subjectId: offerId, relatedOrgId: ctx.organisationId })
  })
}

/** A closed or expired offer becomes a new draft. Offers closed by staff cannot be copied. */
export async function copyOffer(ctx: Context, offerId: string): Promise<string> {
  return db.$transaction(async (tx) => {
    const source = await tx.offer.findFirst({
      where: { id: offerId, organisationId: ctx.organisationId },
      include: { positions: true, skills: true },
    })
    if (!source) throw new DomainError('not-found', 'Offer not found.')
    if (!['CLOSED', 'EXPIRED'].includes(source.status) || source.closedByStaffId) {
      throw new DomainError('bad-state', 'This offer cannot be copied.')
    }
    const copy = await tx.offer.create({
      data: {
        organisationId: ctx.organisationId,
        offeredBy: source.offeredBy,
        title: source.title,
        description: source.description,
        paid: source.paid,
        locationText: source.locationText,
        locationPlaceId: source.locationPlaceId,
        copiedFromId: source.id,
        positions: { create: source.positions.map((p) => ({ positionId: p.positionId })) },
        skills: { create: source.skills.map((s) => ({ skillId: s.skillId })) },
      },
    })
    return copy.id
  })
}
