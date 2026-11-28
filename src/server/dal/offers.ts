import 'server-only'

import type { Prisma } from '@/generated/prisma/client'
import { PAGE_SIZE, type OrgTypeKey } from '@/lib/constants'
import type { OfferFilters } from '@/lib/validation/offer'
import type { ManagerOfferRow, OfferCardData, OfferEditorData, OfferPageData } from '@/lib/view-models/offers'
import { db } from '@/server/db'

const cardSelect = {
  id: true,
  title: true,
  offeredBy: true,
  paid: true,
  locationText: true,
  publishedAt: true,
  expiresAt: true,
  organisation: { select: { name: true, logoFileId: true } },
  positions: { select: { position: { select: { label: true, sortOrder: true } } } },
} satisfies Prisma.OfferSelect

type CardRow = Prisma.OfferGetPayload<{ select: typeof cardSelect }>

function toCard(row: CardRow): OfferCardData {
  return {
    id: row.id,
    title: row.title ?? '',
    organisationName: row.organisation.name,
    organisationLogoFileId: row.organisation.logoFileId,
    offeredBy: row.offeredBy as OrgTypeKey,
    paid: row.paid,
    positions: [...row.positions].sort((a, b) => a.position.sortOrder - b.position.sortOrder).map((p) => p.position.label),
    locationText: row.locationText,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
  }
}

// ─── Directory ──────────────────────────────────────────────────────────

function encodeCursor(publishedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify([publishedAt.toISOString(), id])).toString('base64url')
}

function decodeCursor(cursor: string | undefined): { publishedAt: Date; id: string } | null {
  if (!cursor) return null
  try {
    const [iso, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string]
    const publishedAt = new Date(iso)
    return Number.isNaN(publishedAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id) ? null : { publishedAt, id }
  } catch {
    return null
  }
}

export type OfferPage = { offers: OfferCardData[]; nextCursor: string | null; total: number }

export async function searchOffers(filters: OfferFilters, cursor?: string): Promise<OfferPage> {
  const now = new Date()
  const and: Prisma.OfferWhereInput[] = [{ status: 'PUBLISHED', expiresAt: { gt: now }, organisation: { status: 'PUBLISHED', deletedAt: null } }]
  if (filters.q) {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Offer"
      WHERE immutable_unaccent(lower("title")) % immutable_unaccent(lower(${filters.q}))
         OR immutable_unaccent(lower("title")) LIKE '%' || immutable_unaccent(lower(${filters.q})) || '%'`
    and.push({ id: { in: rows.map((r) => r.id) } })
  }
  if (filters.organisationTypes.length) and.push({ offeredBy: { in: filters.organisationTypes as ('CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND')[] } })
  if (filters.from || filters.to) {
    and.push({
      publishedAt: {
        gte: filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined,
        lte: filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined,
      },
    })
  }
  if (filters.positions.length) and.push({ positions: { some: { positionId: { in: filters.positions } } } })
  if (filters.skills.length) and.push({ skills: { some: { skillId: { in: filters.skills } } } })
  if (filters.organisation) and.push({ organisationId: filters.organisation })
  if (filters.paid) and.push({ paid: filters.paid })
  const where: Prisma.OfferWhereInput = { AND: and }

  const position = decodeCursor(cursor)
  const cursorWhere: Prisma.OfferWhereInput | undefined = position
    ? { OR: [{ publishedAt: { lt: position.publishedAt } }, { publishedAt: position.publishedAt, id: { lt: position.id } }] }
    : undefined

  const [rows, total] = await Promise.all([
    db.offer.findMany({
      where: cursorWhere ? { AND: [where, cursorWhere] } : where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      select: cardSelect,
    }),
    cursor ? Promise.resolve(-1) : db.offer.count({ where }),
  ])
  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const last = page.at(-1)
  return {
    offers: page.map(toCard),
    nextCursor: hasMore && last?.publishedAt ? encodeCursor(last.publishedAt, last.id) : null,
    total,
  }
}

// ─── Offer page ─────────────────────────────────────────────────────────

/** A published, unexpired offer. The managers of the organisation may also open it in other states. */
export async function getOfferPage(id: string, opts: { allowAnyStatusForOrganisationId?: string } = {}): Promise<(OfferPageData & { organisationStatus: string }) | null> {
  const row = await db.offer.findFirst({
    where: { id },
    select: {
      ...cardSelect,
      description: true,
      locationPlaceId: true,
      status: true,
      organisationId: true,
      organisation: { select: { name: true, logoFileId: true, slug: true, status: true } },
      skills: { select: { skill: { select: { label: true, sortOrder: true } } } },
    },
  })
  if (!row) return null
  const own = opts.allowAnyStatusForOrganisationId === row.organisationId
  const open = row.status === 'PUBLISHED' && row.organisation.status === 'PUBLISHED'
  if (!own && !open) return null
  return {
    ...toCard(row),
    organisationId: row.organisationId,
    organisationSlug: row.organisation.slug,
    organisationStatus: row.organisation.status,
    descriptionHtml: row.description ?? '',
    skills: [...row.skills].sort((a, b) => a.skill.sortOrder - b.skill.sortOrder).map((s) => s.skill.label),
    locationPlaceId: row.locationPlaceId,
    status: row.status,
  }
}

/** Open offers shown on an organisation's public page. */
export async function listOpenOffersForOrganisation(organisationId: string): Promise<OfferCardData[]> {
  const rows = await db.offer.findMany({
    where: { organisationId, status: 'PUBLISHED', expiresAt: { gt: new Date() } },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: 20,
    select: cardSelect,
  })
  return rows.map(toCard)
}

// ─── Manager's section ──────────────────────────────────────────────────

export async function listOrganisationOffers(organisationId: string): Promise<ManagerOfferRow[]> {
  const rows = await db.offer.findMany({
    where: { organisationId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      expiresAt: true,
      closedByStaffId: true,
      closedReason: true,
      _count: { select: { applications: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? 'Untitled draft',
    status: r.status,
    publishedAt: r.publishedAt,
    expiresAt: r.expiresAt,
    applicationCount: r._count.applications,
    closedByStaff: r.closedByStaffId !== null,
    closedReason: r.closedReason,
    canCopy: (r.status === 'CLOSED' || r.status === 'EXPIRED') && r.closedByStaffId === null,
  }))
}

export async function getOfferForEdit(organisationId: string, id: string): Promise<OfferEditorData | null> {
  const row = await db.offer.findFirst({
    where: { id, organisationId },
    include: { positions: true, skills: true },
  })
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    title: row.title ?? '',
    description: row.description ?? '',
    paid: row.paid ?? '',
    positionIds: row.positions.map((p) => p.positionId),
    skillIds: row.skills.map((s) => s.skillId),
    locationText: row.locationText ?? '',
    locationPlaceId: row.locationPlaceId ?? '',
  }
}

export async function getOfferReferenceData() {
  const [positions, skills] = await Promise.all([
    db.position.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } }),
    db.skill.findMany({ where: { isActive: true }, orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }], select: { id: true, label: true } }),
  ])
  return { positions, skills }
}
