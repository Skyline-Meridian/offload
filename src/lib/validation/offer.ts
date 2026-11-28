import { z } from 'zod'

import { emptyToUndefined, optionalText, stringList } from '@/lib/validation/fields'

const optionalString = (max: number) => optionalText(max)
const paid = z.preprocess(emptyToUndefined, z.enum(['PAID', 'UNPAID']).optional()) as z.ZodType<'PAID' | 'UNPAID' | undefined>

const shared = {
  positionIds: stringList(15),
  skillIds: stringList(60),
  locationText: optionalString(300),
  locationPlaceId: optionalString(300),
}

/** A draft can be saved with almost nothing filled in; the limits still apply. */
export const offerDraftSchema = z.object({
  title: optionalString(150),
  description: z.string().default(''),
  paid,
  ...shared,
})

/** To publish, the offer must be complete (OFF-1.8). */
export const offerPublishSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150, 'Use at most 150 characters'),
  description: z.string().trim().min(1, 'Description is required'),
  paid: z.enum(['PAID', 'UNPAID'], 'Say whether the offer is paid or unpaid'),
  ...shared,
})

export type OfferDraftInput = z.output<typeof offerDraftSchema>
export type OfferPublishInput = z.output<typeof offerPublishSchema>

export const applySchema = z.object({
  offerId: z.uuid(),
  note: optionalText(2000),
})

export const applicationStatusSchema = z.object({
  applicationId: z.uuid(),
  status: z.enum(['SHORTLISTED', 'CONTACTED', 'REJECTED']),
})

// ─── Directory filters ──────────────────────────────────────────────────

export type OfferFilters = {
  q?: string
  organisationTypes: string[]
  from?: string
  to?: string
  positions: string[]
  skills: string[]
  organisation?: string
  paid?: 'PAID' | 'UNPAID'
}

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s.trim() : undefined
}

function many(v: string | string[] | undefined): string[] {
  return v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean)
}

export function parseOfferFilters(params: Record<string, string | string[] | undefined>): OfferFilters {
  const date = (v: string | string[] | undefined): string | undefined => {
    const s = one(v)
    return s && z.iso.date().safeParse(s).success ? s : undefined
  }
  const paidValue = one(params.paid)
  const organisation = one(params.organisation)
  return {
    q: one(params.q)?.slice(0, 100),
    organisationTypes: many(params.organisationTypes).filter((t) => ['CLUB', 'UNION', 'INSTITUTION', 'BRAND'].includes(t)),
    from: date(params.from),
    to: date(params.to),
    positions: many(params.positions),
    skills: many(params.skills),
    organisation: organisation && z.uuid().safeParse(organisation).success ? organisation : undefined,
    paid: paidValue === 'PAID' || paidValue === 'UNPAID' ? paidValue : undefined,
  }
}

export function offerFiltersToParams(f: OfferFilters): URLSearchParams {
  const out = new URLSearchParams()
  if (f.q) out.set('q', f.q)
  if (f.organisationTypes.length) out.set('organisationTypes', f.organisationTypes.join(','))
  if (f.from) out.set('from', f.from)
  if (f.to) out.set('to', f.to)
  if (f.positions.length) out.set('positions', f.positions.join(','))
  if (f.skills.length) out.set('skills', f.skills.join(','))
  if (f.organisation) out.set('organisation', f.organisation)
  if (f.paid) out.set('paid', f.paid)
  return out
}

