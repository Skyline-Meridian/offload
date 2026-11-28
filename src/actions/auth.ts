'use server'

import { APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { DomainError } from '@/lib/errors'
import { formToObject, type FormState } from '@/lib/form-state'
import { messages } from '@/lib/messages'
import { routes, safeNextPath } from '@/lib/routes'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validation/auth'
import { auth } from '@/server/auth'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { hit } from '@/server/rate-limit'
import { clientIp, withCaptcha } from '@/server/request'
import { registerUser } from '@/server/services/auth/register'

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): FormState {
  return { status: 'error', fieldErrors: error.flatten().fieldErrors }
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)
  const requestHeaders = await headers()
  const ip = await hit('signInIp', clientIp(requestHeaders))
  if (!ip.allowed) return { status: 'error', message: messages.tooManyRequests }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: withCaptcha(requestHeaders, String(formData.get('captchaToken') ?? '')),
    })
  } catch (error) {
    if (error instanceof APIError) {
      if (error.statusCode === 429) return { status: 'error', message: messages.lockedOut }
      return { status: 'error', message: messages.invalidLogin }
    }
    log.error('sign-in failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(safeNextPath(parsed.data.next))
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formToObject(formData)
  const nationalities = formData.getAll('nationalities').map(String).filter(Boolean)
  const parsed = registerSchema.safeParse({
    ...raw,
    nationalities,
    isNewsletterOptedIn: formData.get('isNewsletterOptedIn') === 'on',
  })
  if (!parsed.success) return fieldErrors(parsed.error)

  // Honeypot: bots fill the hidden field. Answer as if it worked, and do nothing.
  if (parsed.data.website) redirect(routes.checkEmail)

  const requestHeaders = await headers()
  if (!(await hit('registerIp', clientIp(requestHeaders))).allowed) {
    return { status: 'error', message: messages.tooManyRequests }
  }

  try {
    await registerUser(
      {
        registerAs: parsed.data.registerAs,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: parsed.data.password,
        dateOfBirth: parsed.data.dateOfBirth,
        nationalities: parsed.data.nationalities,
        isNewsletterOptedIn: parsed.data.isNewsletterOptedIn,
      },
      withCaptcha(requestHeaders, parsed.data.captchaToken),
    )
  } catch (error) {
    if (error instanceof DomainError) {
      if (error.code === 'email-taken') return { status: 'error', fieldErrors: { email: [error.message] } }
      return { status: 'error', message: error.message }
    }
    log.error('registration failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(routes.checkEmail)
}

export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)
  const requestHeaders = await headers()
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: routes.resetPassword },
      headers: withCaptcha(requestHeaders, parsed.data.captchaToken),
    })
  } catch (error) {
    // The answer never reveals whether the account exists.
    log.warn('password reset request failed', errorInfo(error))
  }
  return { status: 'ok', message: 'If an account exists for this email, we have sent a link to reset the password.' }
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData))
  if (!parsed.success) return fieldErrors(parsed.error)
  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.password, token: parsed.data.token } })
  } catch (error) {
    if (error instanceof APIError) return { status: 'error', message: 'This link is invalid or has expired. Request a new one.' }
    log.error('password reset failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  redirect(`${routes.login}?reset=1`)
}

export async function resendVerificationEmail(): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) redirect(routes.login)
  if (viewer.user.isEmailVerified) return { status: 'ok', message: 'Your email is already verified.' }
  if (!(await hit('verificationResendUser', viewer.user.id)).allowed) {
    return { status: 'error', message: messages.tooManyRequests }
  }
  try {
    await auth.api.sendVerificationEmail({
      body: { email: viewer.user.email, callbackURL: routes.verifyEmail },
      headers: await headers(),
    })
  } catch (error) {
    log.error('verification email failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
  return { status: 'ok', message: 'We have sent you a new link.' }
}

export async function logout(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect(routes.login)
}
