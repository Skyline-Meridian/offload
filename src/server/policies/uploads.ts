import 'server-only'

import type { UploadPurposeKey } from '@/lib/constants'
import type { Viewer } from '@/server/dal/viewer'

/** Which upload purposes a viewer may use (01 section 12). */
export function canUpload(viewer: Viewer | null, purpose: UploadPurposeKey): boolean {
  if (!viewer) return false
  const isManager = viewer.role === 'MANAGER' && viewer.membership !== null
  switch (purpose) {
    case 'PROFILE_PICTURE':
      return true
    case 'IDENTITY_DOCUMENT':
      return !viewer.isStaff
    case 'CV':
      return viewer.role === 'PLAYER'
    case 'ORGANISATION_LOGO':
    case 'COACH_IMAGE':
    case 'ORGANISATION_DOCUMENT':
      return isManager
  }
}
