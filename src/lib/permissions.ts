import type { UserRole } from '@/generated/prisma/client'

export type StaffRole = Extract<UserRole, 'ADMINISTRATOR' | 'OFFLOAD_ADMIN'>

const shared = [
  'stats.view',
  'verification.review',
  'users.view',
  'users.edit',
  'users.suspend',
  'users.delete',
  'users.export',
  'organisations.view',
  'organisations.edit',
  'organisations.unpublish',
  'organisations.delete',
  'organisations.removeManager',
  'offers.moderate',
  'billing.view',
  'billing.manage',
  'reference.manage',
  'audit.view',
] as const

const administratorOnly = ['staff.manage', 'users.changeRole', 'settings.manage', 'plans.manage'] as const

/** One map from staff role to permissions (design 05 section 4.1). There is no permission for offers, applications or messages of other users. */
export const PERMISSIONS = {
  ADMINISTRATOR: [...shared, ...administratorOnly],
  OFFLOAD_ADMIN: [...shared],
} as const satisfies Record<StaffRole, readonly string[]>

export type Permission = (typeof PERMISSIONS.ADMINISTRATOR)[number]

export function isStaffRole(role: UserRole): role is StaffRole {
  return role === 'ADMINISTRATOR' || role === 'OFFLOAD_ADMIN'
}

export function permissionsFor(role: UserRole): ReadonlySet<Permission> {
  return new Set(isStaffRole(role) ? PERMISSIONS[role] : [])
}
