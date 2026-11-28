import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

import { normaliseSocial, socialNetworks, type SocialNetwork } from '@/lib/format/social'
import { parseVideoUrl } from '@/lib/format/video'
import {
  checkbox,
  emptyToUndefined,
  optionalDate,
  optionalDecimal,
  optionalInt,
  optionalText,
  stringList,
} from '@/lib/validation/fields'

const name = (label: string) => z.string().trim().min(1, `${label} is required`).max(60, 'Use at most 60 characters')
const countryCode = z.string().length(2)

export const identitySchema = z.object({
  firstName: name('First name'),
  lastName: name('Last name'),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .pipe(z.iso.date('Enter a valid date'))
    .refine((v) => new Date(v) < new Date(), 'Date of birth must be in the past')
    .transform((v) => new Date(`${v}T00:00:00.000Z`)),
  nationalities: stringList(5).pipe(
    z
      .array(countryCode)
      .min(1, 'Choose at least one nationality')
      .max(5, 'Choose up to 5 nationalities')
      .refine((l) => new Set(l).size === l.length, 'Each nationality can be chosen once'),
  ),
  personalPhone: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform((v, ctx) => {
        const parsed = parsePhoneNumberFromString(v, 'GB')
        if (!parsed?.isValid()) {
          ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' })
          return z.NEVER
        }
        return parsed.number
      })
      .optional(),
  ) as z.ZodType<string | undefined>,
  bio: optionalText(2000),
  profilePictureId: z.preprocess(emptyToUndefined, z.uuid().optional()) as z.ZodType<string | undefined>,
})

const orgOrText = {
  id: z.preprocess(emptyToUndefined, z.uuid().optional()) as z.ZodType<string | undefined>,
  text: optionalText(120),
}

export const playingSchema = z.object({
  primaryPositionId: z.preprocess(emptyToUndefined, z.string().optional()) as z.ZodType<string | undefined>,
  secondaryPositionId: z.preprocess(emptyToUndefined, z.string().optional()) as z.ZodType<string | undefined>,
  otherPositionId: z.preprocess(emptyToUndefined, z.string().optional()) as z.ZodType<string | undefined>,
  heightCm: optionalInt('Height', 100, 230, ' cm'),
  weightKg: optionalInt('Weight', 30, 200, ' kg'),
  currentClubId: orgOrText.id,
  currentClubText: orgOrText.text,
  currentUnionId: orgOrText.id,
  currentUnionText: orgOrText.text,
  currentInstitutionId: orgOrText.id,
  currentInstitutionText: orgOrText.text,
  contractEndDate: optionalDate('Contract end date'),
  rugbyCode: z.preprocess(emptyToUndefined, z.enum(['LEAGUE_ONLY', 'UNION_ONLY', 'BOTH']).optional()) as z.ZodType<
    'LEAGUE_ONLY' | 'UNION_ONLY' | 'BOTH' | undefined
  >,
  qualificationIds: stringList(10),
  highestQualification: z.preprocess(emptyToUndefined, z.string().optional()) as z.ZodType<string | undefined>,
  isKeenToRelocate: checkbox,
  isRetired: checkbox,
  isOpenToBrandPartnership: checkbox,
  strengths: optionalText(500),
  workOns: optionalText(500),
  colourPersonality: optionalText(500),
  skillIds: stringList(60),
})

export const eligibilitySchema = z
  .object({
    eligibleCountries: stringList(10).pipe(z.array(countryCode)),
    isCapped: checkbox,
    cappedCountries: stringList(10).pipe(z.array(countryCode)),
    ageGroups: stringList(5).pipe(z.array(z.enum(['U16', 'U18', 'U20', 'SENIOR', 'SEVENS']))),
    firstCap: optionalDate('First cap'),
    lastCap: optionalDate('Last cap'),
    totalCaps: optionalInt('Total caps', 0, 500),
  })
  .superRefine((v, ctx) => {
    if (v.isCapped && v.firstCap && v.lastCap && v.lastCap < v.firstCap) {
      ctx.addIssue({ code: 'custom', path: ['lastCap'], message: 'Last cap must be on or after the first cap' })
    }
  })

export const conditioningSchema = z.object({
  maxSpeedMs: optionalDecimal('Max speed'),
  broadJumpCm: optionalDecimal('Broad jump'),
  test1200Sec: optionalDecimal('1200 m time'),
  cmjCm: optionalDecimal('CMJ'),
  bench1rmKg: optionalDecimal('Bench press 1RM'),
  squat1rmKg: optionalDecimal('Squat 1RM'),
})

export const academicSchema = z.object({ hasAcademicInterest: checkbox, isGraduated: checkbox })

export const clubHistorySchema = z
  .object({
    id: z.preprocess(emptyToUndefined, z.uuid().optional()) as z.ZodType<string | undefined>,
    clubName: z.string().trim().min(1, 'Club name is required').max(120, 'Use at most 120 characters'),
    startDate: optionalDate('Start date'),
    endDate: optionalDate('End date'),
    coaches: optionalText(300),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be on or after the start date',
  })

export const achievementSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()) as z.ZodType<string | undefined>,
  title: z.string().trim().min(1, 'Title is required').max(150, 'Use at most 150 characters'),
  year: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1950, 'Enter a valid year')
      .refine((y) => y <= new Date().getFullYear(), 'The year cannot be in the future')
      .optional(),
  ) as z.ZodType<number | undefined>,
})

const videoUrl = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const parsed = parseVideoUrl(v)
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'Enter a YouTube or Vimeo link' })
      return z.NEVER
    }
    return parsed.canonicalUrl
  })

export const highlightVideoSchema = z.object({
  highlightVideoUrl: z.preprocess(emptyToUndefined, videoUrl.optional()) as z.ZodType<string | undefined>,
})

export const featuredVideoSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()) as z.ZodType<string | undefined>,
  youtubeUrl: videoUrl,
  howToIdentify: optionalText(150),
})

const socialField = (network: SocialNetwork) =>
  z.string().transform((v, ctx) => {
    const result = normaliseSocial(network, v)
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: result.message })
      return z.NEVER
    }
    return result.url
  })

export const socialSchema = z.object(
  Object.fromEntries(socialNetworks.map((n) => [`${n}Url`, socialField(n).default('')])) as {
    [K in `${SocialNetwork}Url`]: z.ZodDefault<ReturnType<typeof socialField>>
  },
)

export const cvSchema = z.object({ cvFileId: z.preprocess(emptyToUndefined, z.uuid().optional()) as z.ZodType<string | undefined> })

/** Filters for the directory. Every key is optional; invalid values are dropped, not reported. */
const num = z.coerce.number().finite()

const rangeKeys = [
  'age',
  'height',
  'weight',
  'maxSpeed',
  'broadJump',
  'test1200',
  'cmj',
  'bench1rm',
  'squat1rm',
] as const
export type RangeKey = (typeof rangeKeys)[number]

export type PlayerFilters = {
  q?: string
  nationality: string[]
  primaryPosition?: string
  anyPosition: string[]
  contractFrom?: string
  contractTo?: string
  eligible: string[]
  capped?: boolean
  qualification: string[]
  rugbyCode: string[]
  keenToRelocate?: boolean
  retired?: boolean
  brandPartnership?: boolean
  club?: string
  skills: string[]
  skillsMode: 'any' | 'all'
  sort: 'newest' | 'oldest'
  ranges: Partial<Record<RangeKey, { min?: number; max?: number }>>
}

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return (Array.isArray(value) ? value : value.split(',')).map((s) => s.trim()).filter(Boolean)
}

function single(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v?.trim() ? v.trim() : undefined
}

function bool(value: string | string[] | undefined): boolean | undefined {
  const v = single(value)
  return v === 'yes' ? true : v === 'no' ? false : undefined
}

function dateOnly(value: string | string[] | undefined): string | undefined {
  const v = single(value)
  return v && z.iso.date().safeParse(v).success ? v : undefined
}

export function parsePlayerFilters(params: Record<string, string | string[] | undefined>): PlayerFilters {
  const ranges: PlayerFilters['ranges'] = {}
  for (const key of rangeKeys) {
    const min = num.safeParse(single(params[`${key}Min`]))
    const max = num.safeParse(single(params[`${key}Max`]))
    if (single(params[`${key}Min`]) !== undefined || single(params[`${key}Max`]) !== undefined) {
      const range = { min: min.success ? min.data : undefined, max: max.success ? max.data : undefined }
      if (range.min !== undefined || range.max !== undefined) ranges[key] = range
    }
  }
  const countries = (value: string | string[] | undefined) => list(value).filter((c) => /^[A-Za-z]{2}$/.test(c)).map((c) => c.toUpperCase())
  return {
    q: single(params.q)?.slice(0, 100),
    nationality: countries(params.nationality),
    primaryPosition: single(params.primaryPosition),
    anyPosition: list(params.anyPosition),
    contractFrom: dateOnly(params.contractFrom),
    contractTo: dateOnly(params.contractTo),
    eligible: countries(params.eligible),
    capped: bool(params.capped),
    qualification: list(params.qualification),
    rugbyCode: list(params.rugbyCode).filter((c) => ['LEAGUE_ONLY', 'UNION_ONLY', 'BOTH'].includes(c)),
    keenToRelocate: bool(params.keenToRelocate),
    retired: bool(params.retired),
    brandPartnership: bool(params.brandPartnership),
    club: single(params.club)?.slice(0, 100),
    skills: list(params.skills),
    skillsMode: single(params.skillsMode) === 'all' ? 'all' : 'any',
    sort: single(params.sort) === 'oldest' ? 'oldest' : 'newest',
    ranges,
  }
}

/** The reverse of parsePlayerFilters, for links and form defaults. Only set values are written. */
export function toSearchParams(filters: PlayerFilters): URLSearchParams {
  const out = new URLSearchParams()
  const set = (k: string, v: string | undefined): void => {
    if (v) out.set(k, v)
  }
  const setList = (k: string, v: string[]): void => {
    if (v.length) out.set(k, v.join(','))
  }
  const yn = (v: boolean | undefined): string | undefined => (v === undefined ? undefined : v ? 'yes' : 'no')
  set('q', filters.q)
  setList('nationality', filters.nationality)
  set('primaryPosition', filters.primaryPosition)
  setList('anyPosition', filters.anyPosition)
  set('contractFrom', filters.contractFrom)
  set('contractTo', filters.contractTo)
  setList('eligible', filters.eligible)
  set('capped', yn(filters.capped))
  setList('qualification', filters.qualification)
  setList('rugbyCode', filters.rugbyCode)
  set('keenToRelocate', yn(filters.keenToRelocate))
  set('retired', yn(filters.retired))
  set('brandPartnership', yn(filters.brandPartnership))
  set('club', filters.club)
  setList('skills', filters.skills)
  if (filters.skills.length > 1 && filters.skillsMode === 'all') out.set('skillsMode', 'all')
  if (filters.sort === 'oldest') out.set('sort', 'oldest')
  for (const [key, range] of Object.entries(filters.ranges)) {
    if (range?.min !== undefined) out.set(`${key}Min`, String(range.min))
    if (range?.max !== undefined) out.set(`${key}Max`, String(range.max))
  }
  return out
}

export const rangeFilterKeys = rangeKeys
