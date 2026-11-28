import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/constants'

export type PasswordRule = { id: string; label: string; test: (password: string) => boolean }

/** One list of rules, used by the form checklist and by server validation (GEN-2.2). */
export const passwordRules: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'One symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function passwordMeetsRules(password: string): boolean {
  return passwordRules.every((rule) => rule.test(password))
}
