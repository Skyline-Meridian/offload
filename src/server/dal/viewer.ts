import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'

import type {
  DocumentStatus,
  MembershipSource,
  MembershipStatus,
  OrganisationStatus,
  OrganisationType,
  UserRole,
} from '@/generated/prisma/client'
import { isStaffRole, permissionsFor, type Permission } from '@/lib/permissions'
import { auth } from '@/server/auth'
import { db } from '@/server/db'
import { hasActiveSubscription } from '@/server/services/billing/entitlement'
import { getSetting } from '@/server/settings'

export type Viewer = {
  user: {
    id: string
    email: string
    isEmailVerified: boolean
    firstName: string | null
    lastName: string | null
    name: string | null
    profilePictureId: string | null
    documentStatus: DocumentStatus
    termsVersion: string
  }
  role: UserRole
  isStaff: boolean
  /** Player: document verified. Manager: active member of a published organisation. Staff: always. */
  isVerified: boolean
  membership: { id: string; status: MembershipStatus; source: MembershipSource; organisationId: string } | null
  organisation: { id: string; name: string; slug: string; type: OrganisationType; status: OrganisationStatus } | null
  entitlements: { subscription: boolean }
  permissions: ReadonlySet<Permission>
  mustAcceptTerms: boolean
}

/** The signed-in user with everything the policies need, or null. Runs once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      firstName: true,
      lastName: true,
      name: true,
      role: true,
      status: true,
      profilePictureId: true,
      documentStatus: true,
      termsVersion: true,
      memberships: {
        where: { status: { in: ['PENDING', 'ACTIVE', 'REJECTED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          source: true,
          organisationId: true,
          organisation: { select: { id: true, name: true, slug: true, type: true, status: true } },
        },
      },
    },
  })
  if (!user || user.status !== 'ACTIVE') return null

  const membershipRow = user.role === 'MANAGER' ? (user.memberships[0] ?? null) : null
  const organisation = membershipRow?.organisation ?? null
  const isStaff = isStaffRole(user.role)

  const subscription =
    membershipRow?.status === 'ACTIVE' && organisation ? await hasActiveSubscription(organisation.id) : false
  const currentTerms = await getSetting<string>('terms.version')

  let isVerified = isStaff
  if (user.role === 'PLAYER') isVerified = user.documentStatus === 'VERIFIED'
  if (user.role === 'MANAGER') isVerified = membershipRow?.status === 'ACTIVE' && organisation?.status === 'PUBLISHED'

  return {
    user: {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      profilePictureId: user.profilePictureId,
      documentStatus: user.documentStatus,
      termsVersion: user.termsVersion,
    },
    role: user.role,
    isStaff,
    isVerified,
    membership: membershipRow
      ? { id: membershipRow.id, status: membershipRow.status, source: membershipRow.source, organisationId: membershipRow.organisationId }
      : null,
    organisation,
    entitlements: { subscription },
    permissions: permissionsFor(user.role),
    mustAcceptTerms: currentTerms !== null && user.termsVersion !== currentTerms,
  }
})
