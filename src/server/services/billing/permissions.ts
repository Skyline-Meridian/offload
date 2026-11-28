import 'server-only'

import { DomainError } from '@/lib/errors'
import type { Permission } from '@/lib/permissions'
import type { Viewer } from '@/server/dal/viewer'

/** Every staff billing service starts here: the viewer must hold the permission (06 design section 7). */
export function requireBillingPermission(viewer: Viewer, permission: Permission): void {
  if (!viewer.permissions.has(permission)) throw new DomainError('not-allowed', 'You cannot do this.')
}
