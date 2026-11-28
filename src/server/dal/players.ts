import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { PAGE_SIZE } from '@/lib/constants'
import { ageOn, contractEndingSoon } from '@/lib/format/age'
import type { PlayerFilters, RangeKey } from '@/lib/validation/player'
import type { PlayerCardData, PlayerProfileData } from '@/lib/view-models/players'
import { db } from '@/server/db'

// ─── Cursor ─────────────────────────────────────────────────────────────

export function encodeCursor(listedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify([listedAt.toISOString(), id])).toString('base64url')
}

export function decodeCursor(cursor: string | undefined): { listedAt: Date; id: string } | null {
  if (!cursor) return null
  try {
    const [iso, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string]
    const listedAt = new Date(iso)
    if (Number.isNaN(listedAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) return null
    return { listedAt, id }
  } catch {
    return null
  }
}

// ─── Card ───────────────────────────────────────────────────────────────

const cardSelect = {
  id: true,
  listedAt: true,
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
} satisfies Prisma.PlayerProfileSelect

type CardRow = Prisma.PlayerProfileGetPayload<{ select: typeof cardSelect }>

function toCard(row: CardRow, today: Date): PlayerCardData {
  return {
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
  }
}

// ─── Search ─────────────────────────────────────────────────────────────

const columnForRange: Record<Exclude<RangeKey, 'age'>, keyof Prisma.PlayerProfileWhereInput> = {
  height: 'heightCm',
  weight: 'weightKg',
  maxSpeed: 'maxSpeedMs',
  broadJump: 'broadJumpCm',
  test1200: 'test1200Sec',
  cmj: 'cmjCm',
  bench1rm: 'bench1rmKg',
  squat1rm: 'squat1rmKg',
}

async function idsByName(q: string): Promise<string[]> {
  const rows =
    q.length < 3
      ? await db.$queryRaw<{ id: string }[]>`
          SELECT p."id" FROM "PlayerProfile" p JOIN "User" u ON u."id" = p."userId"
          WHERE immutable_unaccent(lower(u."firstName" || ' ' || u."lastName")) LIKE '%' || immutable_unaccent(lower(${q})) || '%'`
      : await db.$queryRaw<{ id: string }[]>`
          SELECT p."id" FROM "PlayerProfile" p JOIN "User" u ON u."id" = p."userId"
          WHERE immutable_unaccent(lower(u."firstName" || ' ' || u."lastName")) % immutable_unaccent(lower(${q}))
             OR immutable_unaccent(lower(u."firstName" || ' ' || u."lastName")) LIKE '%' || immutable_unaccent(lower(${q})) || '%'`
  return rows.map((r) => r.id)
}

async function idsByNationality(codes: string[]): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id" FROM "PlayerProfile" p JOIN "User" u ON u."id" = p."userId"
    WHERE u."nationalities" && ${codes}::char(2)[]`
  return rows.map((r) => r.id)
}

async function idsWithAllSkills(skillIds: string[]): Promise<string[]> {
  const rows = await db.$queryRaw<{ playerId: string }[]>`
    SELECT "playerId" FROM "PlayerSkill" WHERE "skillId" = ANY(${skillIds})
    GROUP BY "playerId" HAVING count(DISTINCT "skillId") = ${skillIds.length}`
  return rows.map((r) => r.playerId)
}

async function idsByClub(text: string): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id" FROM "PlayerProfile" p LEFT JOIN "Organisation" o ON o."id" = p."currentClubId"
    WHERE immutable_unaccent(lower(coalesce(o."name", p."currentClubText", ''))) LIKE '%' || immutable_unaccent(lower(${text})) || '%'`
  return rows.map((r) => r.id)
}

function dateOnlyUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

async function buildWhere(filters: PlayerFilters, today: Date): Promise<Prisma.PlayerProfileWhereInput> {
  const and: Prisma.PlayerProfileWhereInput[] = [
    { listedAt: { not: null }, isHidden: false, user: { status: 'ACTIVE' } },
  ]
  const idSets: Promise<string[]>[] = []
  if (filters.q) idSets.push(idsByName(filters.q))
  if (filters.nationality.length) idSets.push(idsByNationality(filters.nationality))
  if (filters.skills.length && filters.skillsMode === 'all') idSets.push(idsWithAllSkills(filters.skills))
  if (filters.club) idSets.push(idsByClub(filters.club))
  for (const ids of await Promise.all(idSets)) and.push({ id: { in: ids } })

  if (filters.skills.length && filters.skillsMode === 'any') and.push({ skills: { some: { skillId: { in: filters.skills } } } })
  if (filters.primaryPosition) and.push({ primaryPositionId: filters.primaryPosition })
  if (filters.anyPosition.length) {
    const ids = filters.anyPosition
    and.push({ OR: [{ primaryPositionId: { in: ids } }, { secondaryPositionId: { in: ids } }, { otherPositionId: { in: ids } }] })
  }
  if (filters.contractFrom || filters.contractTo) {
    and.push({
      contractEndDate: {
        gte: filters.contractFrom ? new Date(`${filters.contractFrom}T00:00:00.000Z`) : undefined,
        lte: filters.contractTo ? new Date(`${filters.contractTo}T00:00:00.000Z`) : undefined,
      },
    })
  }
  if (filters.eligible.length) and.push({ countries: { some: { kind: 'ELIGIBLE', country: { in: filters.eligible } } } })
  if (filters.capped !== undefined) and.push({ isCapped: filters.capped })
  if (filters.qualification.length) and.push({ qualifications: { some: { qualificationId: { in: filters.qualification } } } })
  if (filters.rugbyCode.length) and.push({ rugbyCode: { in: filters.rugbyCode as ('LEAGUE_ONLY' | 'UNION_ONLY' | 'BOTH')[] } })
  if (filters.keenToRelocate !== undefined) and.push({ isKeenToRelocate: filters.keenToRelocate })
  if (filters.retired !== undefined) and.push({ isRetired: filters.retired })
  if (filters.brandPartnership !== undefined) and.push({ isOpenToBrandPartnership: filters.brandPartnership })

  // Players with no value for a filtered field are left out (PLR-9.4): a range on a null column never matches.
  for (const [key, range] of Object.entries(filters.ranges) as [RangeKey, { min?: number; max?: number }][]) {
    if (key === 'age') {
      // Age from X to Y: born between (today - (Y+1) years + 1 day) and (today - X years).
      const todayUtc = dateOnlyUtc(today)
      const born: { gte?: Date; lte?: Date } = {}
      if (range.max !== undefined) {
        const d = new Date(todayUtc)
        d.setUTCFullYear(d.getUTCFullYear() - (range.max + 1))
        d.setUTCDate(d.getUTCDate() + 1)
        born.gte = d
      }
      if (range.min !== undefined) {
        const d = new Date(todayUtc)
        d.setUTCFullYear(d.getUTCFullYear() - range.min)
        born.lte = d
      }
      and.push({ user: { dateOfBirth: born } })
      continue
    }
    and.push({ [columnForRange[key]]: { gte: range.min, lte: range.max } } as Prisma.PlayerProfileWhereInput)
  }
  return { AND: and }
}

export type PlayerPage = { players: PlayerCardData[]; nextCursor: string | null; total: number }

/** One page of the directory. The caller has already checked `playersGate`. */
export async function searchPlayers(filters: PlayerFilters, cursor?: string): Promise<PlayerPage> {
  const today = new Date()
  const where = await buildWhere(filters, today)
  const descending = filters.sort === 'newest'
  const position = decodeCursor(cursor)
  const cursorWhere: Prisma.PlayerProfileWhereInput | undefined = position
    ? descending
      ? { OR: [{ listedAt: { lt: position.listedAt } }, { listedAt: position.listedAt, id: { lt: position.id } }] }
      : { OR: [{ listedAt: { gt: position.listedAt } }, { listedAt: position.listedAt, id: { gt: position.id } }] }
    : undefined

  const [rows, total] = await Promise.all([
    db.playerProfile.findMany({
      where: cursorWhere ? { AND: [where, cursorWhere] } : where,
      orderBy: [{ listedAt: descending ? 'desc' : 'asc' }, { id: descending ? 'desc' : 'asc' }],
      take: PAGE_SIZE + 1,
      select: cardSelect,
    }),
    cursor ? Promise.resolve(-1) : db.playerProfile.count({ where }),
  ])
  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const last = page.at(-1)
  return {
    players: page.map((r) => toCard(r, today)),
    nextCursor: hasMore && last?.listedAt ? encodeCursor(last.listedAt, last.id) : null,
    total,
  }
}

// ─── Profile page ───────────────────────────────────────────────────────

/** Public fields only: no email, phone, date of birth or document data (PLR-11). */
export const publicProfileSelect = {
  id: true,
  userId: true,
  listedAt: true,
  heightCm: true,
  weightKg: true,
  contractEndDate: true,
  rugbyCode: true,
  isKeenToRelocate: true,
  isRetired: true,
  isOpenToBrandPartnership: true,
  strengths: true,
  workOns: true,
  colourPersonality: true,
  isCapped: true,
  firstCap: true,
  lastCap: true,
  totalCaps: true,
  maxSpeedMs: true,
  broadJumpCm: true,
  test1200Sec: true,
  cmjCm: true,
  bench1rmKg: true,
  squat1rmKg: true,
  hasAcademicInterest: true,
  isGraduated: true,
  highlightVideoUrl: true,
  cvFileId: true,
  instagramUrl: true,
  youtubeUrl: true,
  linkedinUrl: true,
  facebookUrl: true,
  xUrl: true,
  currentClubText: true,
  currentUnionText: true,
  currentInstitutionText: true,
  highestQualification: true,
  user: { select: { firstName: true, lastName: true, bio: true, profilePictureId: true, nationalities: true, dateOfBirth: true } },
  primaryPosition: { select: { label: true } },
  secondaryPosition: { select: { label: true } },
  otherPosition: { select: { label: true } },
  currentClub: { select: { name: true, slug: true } },
  currentUnion: { select: { name: true, slug: true } },
  currentInstitution: { select: { name: true, slug: true } },
  countries: { select: { country: true, kind: true }, orderBy: { country: 'asc' } },
  ageGroups: { select: { ageGroup: true } },
  qualifications: { select: { qualification: { select: { id: true, label: true } } } },
  skills: { select: { skill: { select: { id: true, label: true, kind: true, sortOrder: true } } } },
  clubHistory: { select: { id: true, clubName: true, startDate: true, endDate: true, coaches: true } },
  achievements: { select: { id: true, title: true, year: true } },
  featuredVideos: { select: { id: true, youtubeUrl: true, howToIdentify: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.PlayerProfileSelect


function byEndThenStartDesc(a: { startDate: Date | null; endDate: Date | null }, b: { startDate: Date | null; endDate: Date | null }): number {
  const aEnd = a.endDate?.getTime() ?? Number.POSITIVE_INFINITY
  const bEnd = b.endDate?.getTime() ?? Number.POSITIVE_INFINITY
  if (aEnd !== bEnd) return bEnd - aEnd
  return (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0)
}

/** The profile as shown on the public page. The date of birth is turned into an age here and not returned. */
export async function getPlayerProfile(id: string): Promise<PlayerProfileData | null> {
  const row = await db.playerProfile.findFirst({ where: { id, user: { status: 'ACTIVE' } }, select: publicProfileSelect })
  if (!row) return null
  const today = new Date()
  const { user, listedAt, ...rest } = row
  return {
    ...rest,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    age: user.dateOfBirth ? ageOn(user.dateOfBirth, today) : null,
    bio: user.bio,
    pictureFileId: user.profilePictureId,
    nationalities: user.nationalities,
    isListed: listedAt !== null,
    isContractEndingSoon: contractEndingSoon(row.contractEndDate, today),
    clubHistory: [...row.clubHistory].sort(byEndThenStartDesc),
    achievements: [...row.achievements].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title)),
  }
}

// ─── Editor ─────────────────────────────────────────────────────────────

export async function getOwnPlayerProfile(userId: string) {
  return db.playerProfile.findUnique({
    where: { userId },
    include: {
      user: {
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
      },
      currentClub: { select: { name: true } },
      currentUnion: { select: { name: true } },
      currentInstitution: { select: { name: true } },
      countries: true,
      ageGroups: true,
      qualifications: true,
      skills: true,
      clubHistory: true,
      achievements: true,
      featuredVideos: { orderBy: { sortOrder: 'asc' } },
    },
  })
}

export type OwnPlayerProfile = NonNullable<Awaited<ReturnType<typeof getOwnPlayerProfile>>>

export async function getPlayerReferenceData() {
  const [positions, skills, qualifications, countries] = await Promise.all([
    db.position.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } }),
    db.skill.findMany({ where: { isActive: true }, orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }], select: { id: true, label: true, kind: true } }),
    db.qualification.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } }),
    db.country.findMany({ orderBy: { name: 'asc' }, select: { code: true, name: true } }),
  ])
  return { positions, skills, qualifications, countries }
}
