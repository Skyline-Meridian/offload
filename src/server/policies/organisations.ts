import 'server-only'

import type { Viewer } from '@/server/dal/viewer'

/** A manager whose membership has been approved by staff. */
export function isActiveMember(viewer: Viewer | null, organisationId: string): boolean {
  return viewer !== null && viewer.membership?.status === 'ACTIVE' && viewer.membership.organisationId === organisationId
}

/** An active member who is also identity-verified (documents approved). */
export function isVerifiedManagerOf(viewer: Viewer | null, organisationId: string): boolean {
  return isActiveMember(viewer, organisationId) && viewer?.user.documentStatus === 'VERIFIED'
}

/**
 * Who may edit an organisation from the manager dashboard. Staff use the staff pages.
 * A banned organisation cannot be edited.
 */
export function canEditOrganisation(viewer: Viewer | null, organisation: { id: string; status: string }): boolean {
  if (!viewer?.membership || viewer.membership.organisationId !== organisation.id || organisation.status === 'BANNED') return false
  if (viewer.membership.status === 'ACTIVE') return true
  // The manager who registered a new organisation can complete it while it waits for review.
  return viewer.membership.status === 'PENDING' && viewer.membership.source === 'NEW_ORGANISATION'
}

/** A manager waiting for approval, or who has been rejected, can still see the status page. */
export function canViewOwnOrganisationStatus(viewer: Viewer | null): boolean {
  return viewer !== null && viewer.role === 'MANAGER' && viewer.membership !== null
}
