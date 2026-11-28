import 'server-only'

import type { Viewer } from '@/server/dal/viewer'

export type PlayersGate = 'login' | 'verification' | 'subscription' | null

/** Who may open the players directory (design 02 and 06). `null` means access. */
export function playersGate(viewer: Viewer | null): PlayersGate {
  if (!viewer) return 'login'
  if (viewer.isStaff) return null
  if (viewer.role === 'PLAYER') return viewer.isVerified ? null : 'verification'
  if (viewer.role === 'MANAGER') return viewer.entitlements.subscription ? null : 'subscription'
  return 'login'
}

export const canViewPlayers = (viewer: Viewer | null): boolean => playersGate(viewer) === null

export function canViewPlayerProfile(viewer: Viewer | null, profile: { userId: string; isListed: boolean }): boolean {
  if (!viewer) return false
  if (viewer.isStaff || viewer.user.id === profile.userId) return true
  return profile.isListed && canViewPlayers(viewer)
}

export function canEditOwnPlayerProfile(viewer: Viewer | null): viewer is Viewer {
  return viewer !== null && viewer.role === 'PLAYER'
}

/** A CV is for its owner, staff and managers with an active subscription. Never other players. */
export function canViewCv(viewer: Viewer | null, ownerId: string): boolean {
  if (!viewer) return false
  if (viewer.user.id === ownerId || viewer.isStaff) return true
  return viewer.role === 'MANAGER' && viewer.entitlements.subscription
}
