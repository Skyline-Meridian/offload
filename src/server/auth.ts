import 'server-only'

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { captcha } from 'better-auth/plugins'

import { DAY, HOUR, LOCKOUT_FAILURES, LOCKOUT_MINUTES, MINUTE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/lib/constants'
import { messages } from '@/lib/messages'
import { hashPassword, isWrappedHash, verifyPassword } from '@/server/auth/passwords'
import { currentRegistration } from '@/server/auth/registration-context'
import { db } from '@/server/db'
import { sendEmail } from '@/server/email/send'
import { env } from '@/server/env'
import { log } from '@/server/log'
import { consume, hit } from '@/server/rate-limit'

function firstNameOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'there'
}

const authLimitPrefix = 'ba:'

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  advanced: {
    database: { generateId: false },
    useSecureCookies: env.NODE_ENV === 'production',
  },
  user: {
    modelName: 'User',
    fields: { emailVerified: 'isEmailVerified' },
    additionalFields: {
      role: { type: 'string', required: false, input: false },
      status: { type: 'string', required: false, input: false },
      firstName: { type: 'string', required: false, input: false },
      lastName: { type: 'string', required: false, input: false },
      documentStatus: { type: 'string', required: false, input: false },
      dateOfBirth: { type: 'date', required: false, input: false },
      nationalities: { type: 'string[]', required: false, input: false },
      termsVersion: { type: 'string', required: false, input: false },
      termsAcceptedAt: { type: 'date', required: false, input: false },
      isNewsletterOptedIn: { type: 'boolean', required: false, input: false },
    },
    changeEmail: { enabled: true },
  },
  session: {
    modelName: 'Session',
    expiresIn: 365 * DAY,
    updateAge: HOUR,
    cookieCache: { enabled: false },
  },
  account: { modelName: 'Account' },
  verification: { modelName: 'Verification' },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: HOUR,
    password: { hash: hashPassword, verify: verifyPassword },
    sendResetPassword: async ({ user, url }) => {
      await db.$transaction((tx) =>
        sendEmail(tx, {
          type: 'auth.reset-password',
          to: user.email,
          userId: user.id,
          variables: { firstName: firstNameOf(user.name), link: url },
        }),
      )
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 48 * HOUR,
    sendVerificationEmail: async ({ user, url }) => {
      await db.$transaction((tx) =>
        sendEmail(tx, {
          type: 'auth.verify-email',
          to: user.email,
          userId: user.id,
          variables: { firstName: firstNameOf(user.name), link: url },
        }),
      )
    },
    afterEmailVerification: async (user) => {
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } })
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customStorage: {
      consume: async (key, rule) => {
        const result = await consume(authLimitPrefix + key, rule.max, rule.window)
        return { allowed: result.allowed, retryAfter: result.retryAfter }
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const fields = currentRegistration()
          if (!fields) throw new APIError('FORBIDDEN', { message: messages.notAllowed })
          return {
            data: {
              ...user,
              email: user.email.toLowerCase(),
              name: `${fields.firstName} ${fields.lastName}`.trim(),
              role: fields.role,
              firstName: fields.firstName,
              lastName: fields.lastName,
              dateOfBirth: fields.dateOfBirth ?? null,
              nationalities: fields.nationalities ?? [],
              termsVersion: fields.termsVersion,
              termsAcceptedAt: fields.termsAcceptedAt,
              isNewsletterOptedIn: fields.isNewsletterOptedIn,
            },
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({ where: { id: session.userId }, select: { status: true } })
          if (!user || user.status !== 'ACTIVE') return false
          return { data: session }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-in/email') {
        const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : null
        if (!email) return
        const user = await db.user.findUnique({ where: { email }, select: { id: true, lockedUntil: true } })
        if (user?.lockedUntil) {
          if (user.lockedUntil > new Date()) throw new APIError('TOO_MANY_REQUESTS', { message: messages.lockedOut })
          await db.user.update({ where: { id: user.id }, data: { lockedUntil: null, failedLogins: 0 } })
        }
      }
      if (ctx.path === '/sign-up/email' || ctx.path === '/reset-password') {
        const password = ctx.path === '/sign-up/email' ? ctx.body?.password : ctx.body?.newPassword
        if (typeof password === 'string' && !isStrongPassword(password)) {
          throw new APIError('BAD_REQUEST', {
            message: 'Use upper case, lower case, a number and a symbol in your password.',
          })
        }
      }
      if (ctx.path === '/request-password-reset' || ctx.path === '/forget-password') {
        const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : null
        if (email && !(await hit('passwordResetEmail', email)).allowed) {
          throw new APIError('TOO_MANY_REQUESTS', { message: messages.tooManyRequests })
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return
      const email = typeof ctx.body?.email === 'string' ? ctx.body.email.toLowerCase() : null
      if (!email) return
      const session = ctx.context.newSession
      if (session) {
        await db.user.update({ where: { id: session.user.id }, data: { failedLogins: 0, lockedUntil: null } })
        const password = typeof ctx.body?.password === 'string' ? ctx.body.password : null
        if (password) await upgradeWrappedHash(session.user.id, password)
        return
      }
      const user = await db.user.findUnique({ where: { email }, select: { id: true, failedLogins: true } })
      if (!user) return
      const failedLogins = user.failedLogins + 1
      const lock = failedLogins >= LOCKOUT_FAILURES
      await db.user.update({
        where: { id: user.id },
        data: { failedLogins, lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * MINUTE * 1000) : undefined },
      })
      if (lock) log.warn('account locked after failed sign-ins', { userId: user.id })
    }),
  },
  plugins: [
    ...(env.RECAPTCHA_SECRET_KEY
      ? [captcha({ provider: 'google-recaptcha', secretKey: env.RECAPTCHA_SECRET_KEY, minScore: 0.5 })]
      : []),
    nextCookies(),
  ],
})

export function isStrongPassword(password: string): boolean {
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
}

/** After a successful sign-in with an imported WordPress hash, store a normal Argon2id hash instead. */
async function upgradeWrappedHash(userId: string, password: string): Promise<void> {
  const account = await db.account.findUnique({ where: { userId }, select: { password: true } })
  if (account?.password && isWrappedHash(account.password)) {
    await db.account.update({ where: { userId }, data: { password: await hashPassword(password) } })
  }
}
