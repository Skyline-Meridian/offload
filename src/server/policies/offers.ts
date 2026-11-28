import 'server-only'

import type { Viewer } from '@/server/dal/viewer'

/** A manager of a published organisation (approved membership) may create and manage offers. */
export function canManageOffers(viewer: Viewer | null): viewer is Viewer & { organisation: NonNullable<Viewer['organisation']> } {
  return (
    viewer !== null &&
    viewer.role === 'MANAGER' &&
    viewer.membership?.status === 'ACTIVE' &&
    viewer.organisation !== null &&
    viewer.organisation.status === 'PUBLISHED'
  )
}

/** The offer must belong to the manager's own organisation. Staff have no offer editing rights (ADM-4.6). */
export function canEditOffer(viewer: Viewer | null, offer: { organisationId: string; status: string }): boolean {
  return canManageOffers(viewer) && viewer.organisation.id === offer.organisationId && ['DRAFT', 'PENDING', 'PUBLISHED'].includes(offer.status)
}

export function canApply(viewer: Viewer | null, offer: { status: string; expiresAt: Date | null; organisationStatus: string }, now: Date = new Date()): boolean {
  return (
    viewer !== null &&
    viewer.role === 'PLAYER' &&
    viewer.isVerified &&
    viewer.user.isEmailVerified &&
    offer.status === 'PUBLISHED' &&
    offer.expiresAt !== null &&
    offer.expiresAt > now &&
    offer.organisationStatus === 'PUBLISHED'
  )
}

/** Applications are for the organisation's managers, and only while the organisation is subscribed (SUB-3). */
export function canViewApplications(viewer: Viewer | null): boolean {
  return canManageOffers(viewer) && viewer.entitlements.subscription
}
