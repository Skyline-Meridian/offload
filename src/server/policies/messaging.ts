import 'server-only'

import { partyKey } from '@/lib/validation/message'
import type { Viewer } from '@/server/dal/viewer'

/** GEN-3.7: an account with an unverified email cannot send messages. Suspended users have no viewer at all. */
export function canMessage(viewer: Viewer | null): viewer is Viewer {
  return viewer !== null && viewer.user.isEmailVerified
}

/** The channels the viewer reads: their own, plus the organisation's when they are an active manager. */
export function inboxPartiesFor(viewer: Viewer): { personal: string; organisation: string | null } {
  const organisation =
    viewer.role === 'MANAGER' && viewer.membership?.status === 'ACTIVE' && viewer.organisation ? partyKey('O', viewer.organisation.id) : null
  return { personal: partyKey('U', viewer.user.id), organisation }
}

/** A manager may write as the organisation only while their membership is active. */
export function canWriteAsOrganisation(viewer: Viewer): boolean {
  return inboxPartiesFor(viewer).organisation !== null
}

export function ownsParty(viewer: Viewer, party: string): boolean {
  const parties = inboxPartiesFor(viewer)
  return party === parties.personal || party === parties.organisation
}
