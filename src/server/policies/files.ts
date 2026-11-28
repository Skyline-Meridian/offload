import 'server-only'

import type { FilePurpose } from '@/generated/prisma/client'
import type { Viewer } from '@/server/dal/viewer'
import { db } from '@/server/db'

type FileFacts = { id: string; purpose: FilePurpose; ownerId: string | null }

/** Who may open a private file through /files/[fileId]. */
export async function canReadFile(viewer: Viewer | null, file: FileFacts): Promise<boolean> {
  if (!viewer) return false
  if (file.ownerId === viewer.user.id) return true
  switch (file.purpose) {
    case 'IDENTITY_DOCUMENT':
      return viewer.permissions.has('verification.review')
    case 'ORGANISATION_DOCUMENT': {
      if (viewer.permissions.has('verification.review')) return true
      if (!viewer.organisation || viewer.membership?.status !== 'ACTIVE') return false
      const org = await db.organisation.findUnique({ where: { id: viewer.organisation.id }, select: { documentFileId: true } })
      return org?.documentFileId === file.id
    }
    case 'CV':
      // A player's CV is for staff and for managers whose organisation is subscribed. Never other players.
      return viewer.isStaff || (viewer.role === 'MANAGER' && viewer.entitlements.subscription)
    default:
      return false
  }
}

/** Public images: logos and coach images for anyone; profile pictures for signed-in users. */
export function canReadMedia(viewer: Viewer | null, purpose: FilePurpose): boolean {
  if (purpose === 'ORGANISATION_LOGO' || purpose === 'COACH_IMAGE') return true
  if (purpose === 'PROFILE_PICTURE') return viewer !== null
  return false
}
