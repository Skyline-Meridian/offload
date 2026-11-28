import 'server-only'

import type { Prisma } from '@/generated/prisma/client'
import type { ManagerApplicationRow, PlayerApplicationRow } from '@/lib/view-models/offers'
import { db } from '@/server/db'

export type ApplicationFilters = { offerId?: string; status?: 'SUBMITTED' | 'SHORTLISTED' | 'CONTACTED' | 'REJECTED' }

/** Applications for the manager's organisation. The caller has checked `canViewApplications`. */
export async function listApplicationsForOrganisation(organisationId: string, filters: ApplicationFilters): Promise<ManagerApplicationRow[]> {
  const where: Prisma.ApplicationWhereInput = {
    organisationId,
    status: filters.status ?? { not: 'WITHDRAWN' },
    ...(filters.offerId ? { offerId: filters.offerId } : {}),
    player: { user: { status: 'ACTIVE' } },
  }
  const rows = await db.application.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 200,
    select: {
      id: true,
      status: true,
      note: true,
      createdAt: true,
      offer: { select: { id: true, title: true } },
      player: {
        select: {
          id: true,
          currentClubText: true,
          currentClub: { select: { name: true } },
          primaryPosition: { select: { label: true } },
          user: { select: { firstName: true, lastName: true, profilePictureId: true } },
        },
      },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    note: r.note,
    createdAt: r.createdAt,
    offerId: r.offer.id,
    offerTitle: r.offer.title ?? '',
    playerId: r.player.id,
    playerName: `${r.player.user.firstName ?? ''} ${r.player.user.lastName ?? ''}`.trim(),
    pictureFileId: r.player.user.profilePictureId,
    primaryPosition: r.player.primaryPosition?.label ?? null,
    clubName: r.player.currentClub?.name ?? r.player.currentClubText ?? null,
  }))
}

export async function listApplicationsForPlayer(userId: string): Promise<PlayerApplicationRow[]> {
  const now = new Date()
  const rows = await db.application.findMany({
    where: { player: { userId } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 200,
    select: {
      id: true,
      status: true,
      createdAt: true,
      offer: { select: { id: true, title: true, status: true, expiresAt: true, organisation: { select: { name: true, status: true } } } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    offerId: r.offer.id,
    offerTitle: r.offer.title ?? '',
    organisationName: r.offer.organisation.name,
    offerIsOpen: r.offer.status === 'PUBLISHED' && r.offer.expiresAt !== null && r.offer.expiresAt > now && r.offer.organisation.status === 'PUBLISHED',
  }))
}

/** The application the viewing player has on an offer, if any. */
export async function getPlayerApplicationStatus(userId: string, offerId: string): Promise<'SUBMITTED' | 'SHORTLISTED' | 'CONTACTED' | 'REJECTED' | 'WITHDRAWN' | null> {
  const row = await db.application.findFirst({ where: { offerId, player: { userId } }, select: { status: true } })
  return row?.status ?? null
}

export async function listOffersForFilter(organisationId: string): Promise<{ id: string; title: string }[]> {
  const rows = await db.offer.findMany({ where: { organisationId, status: { not: 'DRAFT' } }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true } })
  return rows.map((r) => ({ id: r.id, title: r.title ?? 'Untitled' }))
}
