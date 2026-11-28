import { z } from 'zod'

/** Shared field builders. Form values arrive as strings; empty strings mean "not set". */

export const emptyToUndefined = (v: unknown): unknown => (typeof v === 'string' && v.trim() === '' ? undefined : v)

export function optionalInt(label: string, min: number, max: number, unit = ''): z.ZodType<number | undefined> {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} must be a number` })
      .int(`${label} must be a whole number`)
      .min(min, `${label} must be between ${min} and ${max}${unit}`)
      .max(max, `${label} must be between ${min} and ${max}${unit}`)
      .optional(),
  ) as z.ZodType<number | undefined>
}

export function optionalDecimal(label: string): z.ZodType<number | undefined> {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} must be a number` })
      .positive(`${label} must be greater than 0`)
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most 2 decimals')
      .optional(),
  ) as z.ZodType<number | undefined>
}

export function optionalText(max: number): z.ZodType<string | undefined> {
  return z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `Use at most ${max} characters`).optional(),
  ) as z.ZodType<string | undefined>
}

export function optionalDate(label = 'Date'): z.ZodType<Date | undefined> {
  return z.preprocess(
    emptyToUndefined,
    z.iso
      .date(`${label} must be a valid date`)
      .transform((v) => new Date(`${v}T00:00:00.000Z`))
      .optional(),
  ) as z.ZodType<Date | undefined>
}

/** A checkbox: "on" when ticked, missing when not. */
export const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())

/** Accepts one value or many (a repeated form key) and returns an array without empty entries. */
export function stringList(max = 100): z.ZodType<string[]> {
  return z.preprocess(
    (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
    z.array(z.string().min(1)).max(max),
  ) as z.ZodType<string[]>
}
