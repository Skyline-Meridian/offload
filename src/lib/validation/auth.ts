import { z } from 'zod'

import { passwordMeetsRules } from '@/lib/password-rules'

export const passwordSchema = z
  .string()
  .refine(passwordMeetsRules, 'Your password does not meet the rules below.')

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.'))

const required = (label: string) => z.string().trim().min(1, `${label} is required.`).max(100)

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
  next: z.string().optional(),
})

export const registrationRoles = ['PLAYER', 'CLUB', 'UNION', 'INSTITUTION', 'BRAND'] as const
export type RegistrationRole = (typeof registrationRoles)[number]

export const registerSchema = z
  .object({
    registerAs: z.enum(registrationRoles, 'Choose how you are registering.'),
    firstName: required('First name'),
    lastName: required('Last name'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required.')
      .pipe(z.iso.date('Enter a valid date.'))
      .refine((v) => new Date(v) < new Date(), 'Date of birth must be in the past.'),
    nationalities: z.array(z.string().length(2)).min(1, 'Choose at least one nationality.'),
    acceptTerms: z.literal('on', 'You must accept the terms and conditions.'),
    isNewsletterOptedIn: z.boolean(),
    website: z.string().optional(),
    captchaToken: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })

export const forgotPasswordSchema = z.object({ email: emailSchema, captchaToken: z.string().optional() })

export const resetPasswordSchema = z
  .object({ token: z.string().min(1), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' })
