import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

import type { OrgTypeKey } from '@/lib/constants'
import { normaliseSocial, type SocialNetwork } from '@/lib/format/social'
import { emptyToUndefined, optionalDate, optionalInt, optionalText, stringList } from '@/lib/validation/fields'

const opt = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional()) as unknown as z.ZodType<z.output<T> | undefined>

const httpsUrl = z
  .string()
  .trim()
  .transform((v) => (/^https?:\/\//i.test(v) ? v.replace(/^http:/i, 'https:') : `https://${v}`))
  .pipe(z.url('Enter a valid link'))

const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const parsed = parsePhoneNumberFromString(v, 'GB')
    if (!parsed?.isValid()) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' })
      return z.NEVER
    }
    return parsed.number
  })

const social = (network: SocialNetwork) =>
  z
    .string()
    .default('')
    .transform((v, ctx) => {
      const result = normaliseSocial(network, v)
      if (!result.ok) {
        ctx.addIssue({ code: 'custom', message: result.message })
        return z.NEVER
      }
      return result.url
    })

export const SOCIAL_FIELDS = ['facebookUrl', 'instagramUrl', 'linkedinUrl', 'xUrl', 'youtubeUrl'] as const

const country = z.string().length(2, 'Choose a country')

// ─── Field labels that change by type (03 section 4) ────────────────────

export function fieldLabel(type: OrgTypeKey, field: 'registrationNumber' | 'address' | 'founded' | 'name'): string {
  const labels = {
    registrationNumber: { CLUB: 'Club registration number', UNION: 'Union registration number', INSTITUTION: 'Registration number', BRAND: 'Registration number' },
    address: { CLUB: 'Club address', UNION: 'Headquarters address', INSTITUTION: 'Campus address', BRAND: 'Headquarters address' },
    founded: { CLUB: 'Year founded', UNION: 'Year founded', INSTITUTION: 'Year founded', BRAND: 'Year founded' },
    name: { CLUB: 'Club name', UNION: 'Union name', INSTITUTION: 'College or university name', BRAND: 'Brand name' },
  } as const
  return labels[field][type]
}

// ─── Shared parts ───────────────────────────────────────────────────────

const baseFields = {
  name: z.string().trim().min(1, 'Name is required').max(120, 'Use at most 120 characters'),
  logoFileId: opt(z.uuid()),
  officialEmail: opt(z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))),
  officialPhone: opt(phone),
  foundedYear: optionalInt('Year founded', 1800, new Date().getFullYear()),
  description: z.string().default(''),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postcode: optionalText(20),
  country,
  mapAddress: optionalText(300),
  placeId: opt(z.string().trim().max(300)),
  facebookUrl: social('facebook'),
  instagramUrl: social('instagram'),
  linkedinUrl: social('linkedin'),
  xUrl: social('x'),
  youtubeUrl: social('youtube'),
  documentFileId: opt(z.uuid()),
}

const sportsFields = {
  registrationNumber: z.string().trim().min(1, 'Registration number is required').max(50, 'Use at most 50 characters'),
  trainingGround: optionalText(300),
  trainingGroundPlaceId: opt(z.string().trim().max(300)),
  playingGround: optionalText(300),
  playingGroundPlaceId: opt(z.string().trim().max(300)),
  previousResults: optionalText(2000),
}

const leagueFields = {
  leagueIds: stringList(20),
  level: optionalText(60),
}

const brandFields = {
  website: httpsUrl,
  industryId: z.string().min(1, 'Industry is required'),
  industryOther: opt(z.string().trim().max(60, 'Use at most 60 characters')),
}

const institutionFields = {
  institutionKind: z.enum(['COLLEGE', 'UNIVERSITY'], 'Choose college or university'),
}

const sports = z.object({ ...baseFields, ...sportsFields })
const schemas = {
  CLUB: z.object({ ...baseFields, ...sportsFields, ...leagueFields, website: opt(httpsUrl) }),
  UNION: z.object({ ...baseFields, ...sportsFields, ...leagueFields, website: opt(httpsUrl) }),
  INSTITUTION: sports.extend({ ...institutionFields, website: opt(httpsUrl) }),
  BRAND: z.object({ ...baseFields, ...brandFields }),
} as const

/** Fields that exist only for some types. Sending one for another type is an error. */
const typeOnlyFields: Record<string, readonly OrgTypeKey[]> = {
  registrationNumber: ['CLUB', 'UNION', 'INSTITUTION'],
  trainingGround: ['CLUB', 'UNION', 'INSTITUTION'],
  playingGround: ['CLUB', 'UNION', 'INSTITUTION'],
  previousResults: ['CLUB', 'UNION', 'INSTITUTION'],
  leagueIds: ['CLUB', 'UNION'],
  level: ['CLUB', 'UNION'],
  institutionKind: ['INSTITUTION'],
  industryId: ['BRAND'],
  industryOther: ['BRAND'],
}

const typeLabels: Record<OrgTypeKey, string> = { CLUB: 'clubs', UNION: 'unions', INSTITUTION: 'colleges and universities', BRAND: 'brands' }

export function organisationSchema(type: OrgTypeKey) {
  return schemas[type]
    .superRefine((value, ctx) => {
      if (type === 'BRAND' && value && 'industryId' in value && value.industryId === 'other' && !('industryOther' in value && value.industryOther)) {
        ctx.addIssue({ code: 'custom', path: ['industryOther'], message: 'Tell us your industry' })
      }
    })
}

/** Reports fields that were sent but do not apply to the type. Run on the raw form object before parsing. */
export function inapplicableFieldErrors(type: OrgTypeKey, raw: Record<string, unknown>): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  for (const [field, types] of Object.entries(typeOnlyFields)) {
    const sent = raw[field]
    const filled = Array.isArray(sent) ? sent.length > 0 : typeof sent === 'string' && sent.trim() !== ''
    if (filled && !types.includes(type)) errors[field] = [`This field does not apply to ${typeLabels[type]}`]
  }
  return errors
}

// ─── Child entries ──────────────────────────────────────────────────────

const id = opt(z.uuid())

export const coachSchema = z
  .object({
    id,
    name: z.string().trim().min(1, 'Name is required').max(120),
    jobRole: z.string().trim().min(1, 'Job role is required').max(120),
    startDate: z.string().min(1, 'Joining date is required').pipe(z.iso.date('Enter a valid date')).transform((v) => new Date(`${v}T00:00:00.000Z`)),
    endDate: optionalDate('End date'),
    photoFileId: opt(z.uuid()),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ['endDate'], message: 'End date must be on or after the start date' })

export const seasonSchema = z
  .object({
    id,
    label: z.string().trim().min(1, 'Label is required').max(60),
    startDate: z.string().min(1, 'Start date is required').pipe(z.iso.date('Enter a valid date')).transform((v) => new Date(`${v}T00:00:00.000Z`)),
    endDate: z.string().min(1, 'End date is required').pipe(z.iso.date('Enter a valid date')).transform((v) => new Date(`${v}T00:00:00.000Z`)),
  })
  .refine((v) => v.endDate > v.startDate, { path: ['endDate'], message: 'End date must be after the start date' })

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time like 18:30')

export const trainingSessionSchema = z
  .object({ id, day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']), startTime: time, endTime: time })
  .refine((v) => v.endTime > v.startTime, { path: ['endTime'], message: 'End time must be after the start time' })

export const pathwaySchema = z
  .object({ id, institutionId: opt(z.uuid()), institutionText: optionalText(150) })
  .refine((v) => Boolean(v.institutionId) !== Boolean(v.institutionText), {
    path: ['institutionText'],
    message: 'Choose an institution from the list or type its name, not both',
  })

// ─── Registration ───────────────────────────────────────────────────────

/** What a manager enters when registering a new organisation (a short form; the rest is completed in the editor). */
export function registrationOrganisationSchema(type: OrgTypeKey) {
  const shared = {
    name: baseFields.name,
    country,
    officialEmail: baseFields.officialEmail,
    officialPhone: baseFields.officialPhone,
  }
  if (type === 'BRAND') return z.object({ ...shared, ...brandFields })
  const base = z.object({ ...shared, registrationNumber: sportsFields.registrationNumber })
  return type === 'INSTITUTION' ? base.extend(institutionFields) : base
}

// ─── Directory filters ──────────────────────────────────────────────────

export type OrganisationFilters = {
  q?: string
  country?: string
  leagues: string[]
  institutionKind?: 'COLLEGE' | 'UNIVERSITY'
  industry?: string
  hasOffer: boolean
  sort: 'name' | 'newest'
}

export function parseOrganisationFilters(params: Record<string, string | string[] | undefined>): OrganisationFilters {
  const one = (v: string | string[] | undefined): string | undefined => {
    const s = Array.isArray(v) ? v[0] : v
    return s?.trim() ? s.trim() : undefined
  }
  const many = (v: string | string[] | undefined): string[] =>
    v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean)
  const kind = one(params.institutionKind)
  const countryValue = one(params.country)
  return {
    q: one(params.q)?.slice(0, 100),
    country: countryValue && /^[A-Za-z]{2}$/.test(countryValue) ? countryValue.toUpperCase() : undefined,
    leagues: many(params.leagues),
    institutionKind: kind === 'COLLEGE' || kind === 'UNIVERSITY' ? kind : undefined,
    industry: one(params.industry),
    hasOffer: one(params.hasOffer) === 'yes',
    sort: one(params.sort) === 'newest' ? 'newest' : 'name',
  }
}

export function organisationFiltersToParams(f: OrganisationFilters): URLSearchParams {
  const out = new URLSearchParams()
  if (f.q) out.set('q', f.q)
  if (f.country) out.set('country', f.country)
  if (f.leagues.length) out.set('leagues', f.leagues.join(','))
  if (f.institutionKind) out.set('institutionKind', f.institutionKind)
  if (f.industry) out.set('industry', f.industry)
  if (f.hasOffer) out.set('hasOffer', 'yes')
  if (f.sort === 'newest') out.set('sort', 'newest')
  return out
}
