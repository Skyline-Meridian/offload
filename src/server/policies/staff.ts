import 'server-only'

import { notFound } from 'next/navigation'

import type { Permission } from '@/lib/permissions'
import { getViewer, type Viewer } from '@/server/dal/viewer'

export function hasPermission(viewer: Viewer, permission: Permission): boolean {
  return viewer.permissions.has(permission)
}

/** Returns the viewer when they hold the permission. Otherwise the page is a 404, so the staff area is not advertised. */
export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer || !hasPermission(viewer, permission)) notFound()
  return viewer
}
