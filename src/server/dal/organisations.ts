import 'server-only'

import type { OrganisationType, Prisma } from '@/generated/prisma/client'
import { ORG_TYPE_LABELS, PAGE_SIZE, type OrgTypeKey } from '@/lib/constants'
import { routes } from '@/lib/routes'
import type { OrganisationFilters } from '@/lib/validation/organisation'
import type { OrganisationCardData, OrganisationPageData, OrganisationPickerOption } from '@/lib/view-models/organisations'
import type { PlayerCardData } from '@/lib/view-models/players'
import { db } from '@/server/db'
import { htmlToText } from '@/server/sanitize'
import { contractEndingSoon } from '@/lib/format/age'

const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function typeLabel(type: OrganisationType, kind: 'COLLEGE' | 'UNIVERSITY' | null): string {
  if (type === 'INSTITUTION') return kind === 'COLLEGE' ? 'College' : 'University'
  return ORG_TYPE_LABELS[type]
}

// ─── Public page ────────────────────────────────────────────────────────

const pageSelect = {
  id: true,
  type: true,
  slug: true,
  name: true,
  description: true,
  logoFileId: true,
  officialEmail: true,
  officialPhone: true,
  website: true,
  foundedYear: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  region: true,
  postcode: true,
  country: true,
  mapAddress: true,
  placeId: true,
  facebookUrl: true,
  linkedinUrl: true,
  instagramUrl: true,
  xUrl: true,
  youtubeUrl: true,
  trainingGround: true,
  trainingGroundPlaceId: true,
  playingGround: true,
  playingGroundPlaceId: true,
  previousResults: true,
  level: true,
  institutionKind: true,
  industryOther: true,
  industry: { select: { label: true } },
  leagues: { select: { league: { select: { name: true, sortOrder: true } } } },
  coaches: { select: { id: true, name: true, jobRole: true, photoFileId: true, startDate: true, endDate: true }, orderBy: { startDate: 'desc' } },
  seasons: { select: { id: true, label: true, startDate: true, endDate: true }, orderBy: { startDate: 'desc' } },
  trainingSessions: { select: { id: true, day: true, startTime: true, endTime: true } },
  pathways: {
    select: { id: true, institutionText: true, institution: { select: { name: true, slug: true, type: true, status: true } } },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.OrganisationSelect

type PageRow = Prisma.OrganisationGetPayload<{ select: typeof pageSelect }>

function toPageData(row: PageRow): OrganisationPageData {
  const type = row.type as OrgTypeKey
  const socials: [string, string | null][] = [
    ['Facebook', row.facebookUrl],
    ['Instagram', row.instagramUrl],
    ['LinkedIn', row.linkedinUrl],
    ['X', row.xUrl],
    ['YouTube', row.youtubeUrl],
  ]
  const html = row.description ?? ''
  return {
    id: row.id,
    type,
    slug: row.slug,
    name: row.name,
    typeLabel: typeLabel(row.type, row.institutionKind),
    descriptionHtml: html,
    descriptionText: htmlToText(html),
    logoFileId: row.logoFileId,
    officialEmail: row.officialEmail,
    officialPhone: row.officialPhone,
    website: row.website,
    foundedYear: row.foundedYear,
    address: { line1: row.addressLine1, line2: row.addressLine2, city: row.city, region: row.region, postcode: row.postcode, country: row.country },
    mapAddress: row.mapAddress,
    placeId: row.placeId,
    social: socials.filter((s): s is [string, string] => Boolean(s[1])).map(([label, url]) => ({ label, url })),
    trainingGround: row.trainingGround ? { text: row.trainingGround, placeId: row.trainingGroundPlaceId } : null,
    playingGround: row.playingGround ? { text: row.playingGround, placeId: row.playingGroundPlaceId } : null,
    previousResults: row.previousResults,
    level: row.level,
    institutionKind: row.institutionKind,
    industry: row.industry ? (row.industry.label === 'Other' && row.industryOther ? row.industryOther : row.industry.label) : null,
    leagues: [...row.leagues].sort((a, b) => a.league.sortOrder - b.league.sortOrder).map((l) => l.league.name),
    coaches: row.coaches,
    seasons: row.seasons,
    trainingSessions: [...row.trainingSessions].sort(
      (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.startTime.localeCompare(b.startTime),
    ),
    pathways: row.pathways.map((p) =>
      p.institution && p.institution.status === 'PUBLISHED'
        ? { id: p.id, text: p.institution.name, href: routes.orgPage(p.institution.type, p.institution.slug) }
        : { id: p.id, text: p.institution?.name ?? p.institutionText ?? '', href: null },
    ),
  }
}

/** Published, not deleted. Staff and managers see their own draft state through the editor instead. */
export async function getPublicOrganisation(type: OrgTypeKey, slug: string): Promise<OrganisationPageData | null> {
  const row = await db.organisation.findFirst({ where: { type, slug, status: 'PUBLISHED', deletedAt: null }, select: pageSelect })
  return row ? toPageData(row) : null
}

/** Where an old slug points now. */
export async function findSlugRedirect(type: OrgTypeKey, oldSlug: string): Promise<string | null> {
  const redirect = await db.organisationSlugRedirect.findUnique({ where: { oldSlug }, select: { organisationId: true } })
  if (!redirect) return null
  const org = await db.organisation.findFirst({
    where: { id: redirect.organisationId, type, status: 'PUBLISHED', deletedAt: null },
    select: { slug: true },
  })
  return org?.slug ?? null
}

export async function listPublishedOrganisationSlugs(): Promise<{ type: OrgTypeKey; slug: string; updatedAt: Date }[]> {
  const rows = await db.organisation.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    select: { type: true, slug: true, updatedAt: true },
  })
  return rows.map((r) => ({ type: r.type as OrgTypeKey, slug: r.slug, updatedAt: r.updatedAt }))
}

// ─── Players at an organisation (ORG-9.4) ───────────────────────────────

export async function listPlayersAtOrganisation(organisationId: string, type: OrgTypeKey, limit = 12): Promise<PlayerCardData[]> {
  const column = type === 'CLUB' ? 'currentClubId' : type === 'UNION' ? 'currentUnionId' : type === 'INSTITUTION' ? 'currentInstitutionId' : null
  if (!column) return []
  const today = new Date()
  const rows = await db.playerProfile.findMany({
    where: { [column]: organisationId, listedAt: { not: null }, isHidden: false, user: { status: 'ACTIVE' } },
    orderBy: [{ listedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      heightCm: true,
      weightKg: true,
      contractEndDate: true,
      isRetired: true,
      currentClubText: true,
      user: { select: { firstName: true, lastName: true, profilePictureId: true } },
      primaryPosition: { select: { label: true } },
      currentClub: { select: { name: true } },
      countries: { where: { kind: 'ELIGIBLE' }, select: { country: true }, orderBy: { country: 'asc' } },
      qualifications: { select: { qualificationId: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    name: `${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim(),
    pictureFileId: row.user.profilePictureId,
    primaryPosition: row.primaryPosition?.label ?? null,
    clubName: row.currentClub?.name ?? row.currentClubText ?? null,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    eligibleCountries: row.countries.map((c) => c.country),
    hasEqp: row.qualifications.some((q) => q.qualificationId === 'eqp'),
    hasJiff: row.qualifications.some((q) => q.qualificationId === 'jiff'),
    isContractEndingSoon: contractEndingSoon(row.contractEndDate, today),
    isRetired: row.isRetired,
  }))
}

// ─── Directory ──────────────────────────────────────────────────────────

function encodeCursor(sort: string, id: string): string {
  return Buffer.from(JSON.stringify([sort, id])).toString('base64url')
}

function decodeCursor(cursor: string | undefined): { sort: string; id: string } | null {
  if (!cursor) return null
  try {
    const [sort, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string]
    if (typeof sort !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return null
    return { sort, id }
  } catch {
    return null
  }
}

export type OrganisationPage = { organisations: OrganisationCardData[]; nextCursor: string | null; total: number }

export async function searchOrganisations(type: OrgTypeKey, filters: OrganisationFilters, cursor?: string): Promise<OrganisationPage> {
  const and: Prisma.OrganisationWhereInput[] = [{ type, status: 'PUBLISHED', deletedAt: null }]
  if (filters.q) {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Organisation"
      WHERE "type" = ${type}::"OrganisationType"
        AND (immutable_unaccent(lower("name")) % immutable_unaccent(lower(${filters.q}))
          OR immutable_unaccent(lower("name")) LIKE '%' || immutable_unaccent(lower(${filters.q})) || '%')`
    and.push({ id: { in: rows.map((r) => r.id) } })
  }
  if (filters.country) and.push({ country: filters.country })
  if (filters.leagues.length) and.push({ leagues: { some: { leagueId: { in: filters.leagues } } } })
  if (filters.institutionKind) and.push({ institutionKind: filters.institutionKind })
  if (filters.industry) and.push({ industryId: filters.industry })
  if (filters.hasOffer) and.push({ offers: { some: { status: 'PUBLISHED', expiresAt: { gt: new Date() } } } })
  const where: Prisma.OrganisationWhereInput = { AND: and }

  const byName = filters.sort === 'name'
  const position = decodeCursor(cursor)
  const cursorWhere: Prisma.OrganisationWhereInput | undefined = position
    ? byName
      ? { OR: [{ name: { gt: position.sort } }, { name: position.sort, id: { gt: position.id } }] }
      : { OR: [{ createdAt: { lt: new Date(position.sort) } }, { createdAt: new Date(position.sort), id: { lt: position.id } }] }
    : undefined

  const [rows, total] = await Promise.all([
    db.organisation.findMany({
      where: cursorWhere ? { AND: [where, cursorWhere] } : where,
      orderBy: byName ? [{ name: 'asc' }, { id: 'asc' }] : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      select: { id: true, type: true, slug: true, name: true, logoFileId: true, city: true, country: true, institutionKind: true, createdAt: true },
    }),
    cursor ? Promise.resolve(-1) : db.organisation.count({ where }),
  ])
  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const last = page.at(-1)
  return {
    organisations: page.map((r) => ({
      id: r.id,
      type: r.type as OrgTypeKey,
      slug: r.slug,
      name: r.name,
      logoFileId: r.logoFileId,
      typeLabel: typeLabel(r.type, r.institutionKind),
      city: r.city,
      country: r.country,
    })),
    nextCursor: hasMore && last ? encodeCursor(byName ? last.name : last.createdAt.toISOString(), last.id) : null,
    total,
  }
}

/** Up to 10 published organisations of a type, for the "current club" style pickers. */
export async function searchOrganisationsForPicker(type: OrgTypeKey, q: string): Promise<OrganisationPickerOption[]> {
  const text = q.trim().slice(0, 100)
  if (text.length < 2) return []
  const rows = await db.$queryRaw<OrganisationPickerOption[]>`
    SELECT "id", "name", "city" FROM "Organisation"
    WHERE "type" = ${type}::"OrganisationType" AND "status" = 'PUBLISHED' AND "deletedAt" IS NULL
      AND immutable_unaccent(lower("name")) LIKE '%' || immutable_unaccent(lower(${text})) || '%'
    ORDER BY "name" LIMIT 10`
  return rows
}

// ─── Editor ─────────────────────────────────────────────────────────────

export async function getOwnOrganisation(organisationId: string) {
  return db.organisation.findFirst({
    where: { id: organisationId, deletedAt: null },
    include: {
      leagues: true,
      coaches: { orderBy: { startDate: 'desc' } },
      seasons: { orderBy: { startDate: 'desc' } },
      trainingSessions: true,
      pathways: { include: { institution: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
      changeRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
      members: {
        where: { status: 'ACTIVE' },
        select: { userId: true, user: { select: { firstName: true, lastName: true } } },
      },
    },
  })
}

export type OwnOrganisation = NonNullable<Awaited<ReturnType<typeof getOwnOrganisation>>>

/** The manager's own details, as strings ready for the identity form. */
export async function getManagerIdentity(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      nationalities: true,
      personalPhone: true,
      bio: true,
      profilePictureId: true,
      documentStatus: true,
      isEmailVerified: true,
    },
  })
  return user
}

export async function getOrganisationReferenceData() {
  const [leagues, industries, countries] = await Promise.all([
    db.league.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    db.industry.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } }),
    db.country.findMany({ orderBy: { name: 'asc' }, select: { code: true, name: true } }),
  ])
  return { leagues, industries, countries }
}
