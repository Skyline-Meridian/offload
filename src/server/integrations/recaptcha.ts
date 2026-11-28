import 'server-only'

import { env } from '@/server/env'

/**
 * Checks a reCAPTCHA v3 token. With no secret configured, the check passes outside production
 * (local development and tests) and fails in production.
 */
export async function verifyRecaptcha(token: string | null | undefined, action: string): Promise<boolean> {
  if (!env.RECAPTCHA_SECRET_KEY) return env.NODE_ENV !== 'production'
  if (!token) return false
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.RECAPTCHA_SECRET_KEY, response: token }),
    })
    const result = (await response.json()) as { success?: boolean; score?: number; action?: string }
    return result.success === true && (result.score ?? 0) >= 0.5 && result.action === action
  } catch {
    return false
  }
}
