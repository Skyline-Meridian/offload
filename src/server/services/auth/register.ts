import 'server-only'

import { APIError } from 'better-auth/api'

import { DomainError } from '@/lib/errors'
import type { RegistrationRole } from '@/lib/validation/auth'
import { auth } from '@/server/auth'
import { withRegistration } from '@/server/auth/registration-context'
import { db, type Tx } from '@/server/db'
import { enqueue } from '@/server/outbox'
import { getSetting } from '@/server/settings'
import { messages } from '@/lib/messages'

export type RegisterInput = {
  registerAs: RegistrationRole
  firstName: string
  lastName: string
  email: string
  password: string
  dateOfBirth: string
  nationalities: string[]
  isNewsletterOptedIn: boolean
}

/** Hooks that other modules add to registration, run in the same transaction as the profile rows. */
export type RegistrationExtension = (tx: Tx, userId: string) => Promise<void>

/**
 * Creates the account, signs the user in (the session cookie is set by Better Auth) and creates the
 * role records. Throws DomainError for known failures.
 */
export async function registerUser(
  input: RegisterInput,
  requestHeaders: Headers,
  extend?: RegistrationExtension,
): Promise<{ userId: string }> {
  const termsVersion = (await getSetting<string>('terms.version')) ?? '1'
  const role = input.registerAs === 'PLAYER' ? 'PLAYER' : 'MANAGER'

  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } })
  if (existing) throw new DomainError('email-taken', 'This email is already registered.')

  let userId: string
  try {
    const result = await withRegistration(
      {
        role,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
        nationalities: input.nationalities,
        termsVersion,
        termsAcceptedAt: new Date(),
        isNewsletterOptedIn: input.isNewsletterOptedIn,
      },
      () =>
        auth.api.signUpEmail({
          body: {
            email: input.email,
            password: input.password,
            name: `${input.firstName} ${input.lastName}`.trim(),
            callbackURL: '/verify-email',
          },
          headers: requestHeaders,
        }),
    )
    userId = result.user.id
  } catch (error) {
    if (error instanceof APIError) {
      if (error.body?.code === 'USER_ALREADY_EXISTS' || error.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        throw new DomainError('email-taken', 'This email is already registered.')
      }
      throw new DomainError('register-failed', error.body?.message ?? messages.genericError)
    }
    throw error
  }

  try {
    await db.$transaction(async (tx) => {
      if (role === 'PLAYER') await tx.playerProfile.create({ data: { userId } })
      if (input.isNewsletterOptedIn) await enqueue(tx, 'newsletter.subscribe', { userId })
      if (extend) await extend(tx, userId)
    })
  } catch (error) {
    // Do not leave an account without its profile behind.
    await db.user.delete({ where: { id: userId } })
    throw error
  }
  return { userId }
}
