import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'

import type { UserRole } from '@/generated/prisma/client'

/**
 * Platform fields for a new user. Better Auth endpoints cannot set them (they are not inputs), so the
 * registration action puts them here and a database hook reads them while the user row is created.
 */
export type RegistrationFields = {
  role: UserRole
  firstName: string
  lastName: string
  dateOfBirth?: Date | null
  nationalities?: string[]
  termsVersion: string
  termsAcceptedAt: Date
  isNewsletterOptedIn: boolean
}

const storage = new AsyncLocalStorage<RegistrationFields>()

export function withRegistration<T>(fields: RegistrationFields, fn: () => Promise<T>): Promise<T> {
  return storage.run(fields, fn)
}

export function currentRegistration(): RegistrationFields | undefined {
  return storage.getStore()
}
