import 'server-only'

import type { OrganisationType } from '@/generated/prisma/client'
import type { Viewer } from '@/server/dal/viewer'

export type BuyBlock = 'login' | 'not-manager' | 'not-verified' | 'not-published' | 'wrong-type' | 'already-subscribed' | 'retired'

export const buyBlockMessages: Record<BuyBlock, string> = {
  login: 'Sign in to subscribe.',
  'not-manager': 'Only organisation managers can subscribe.',
  'not-verified': 'Your account and organisation must be approved before you can subscribe.',
  'not-published': 'Your organisation must be published before you can subscribe.',
  'wrong-type': 'This plan is for a different type of organisation.',
  'already-subscribed': 'Your organisation already has a subscription.',
  retired: 'This plan is no longer available.',
}

type ManagerViewer = Viewer & { organisation: NonNullable<Viewer['organisation']> }

/** A verified manager with an approved membership: may open the subscription page, cancel, switch and use the Portal. */
export function canManageBilling(viewer: Viewer | null): viewer is ManagerViewer {
  return (
    viewer !== null &&
    viewer.role === 'MANAGER' &&
    viewer.membership?.status === 'ACTIVE' &&
    viewer.organisation !== null &&
    viewer.user.documentStatus === 'VERIFIED' &&
    viewer.user.isEmailVerified
  )
}

/** SUB-1.2 and SUB-4.1. Returns the reason when the plan cannot be bought. */
export function buyBlock(
  viewer: Viewer | null,
  plan: { organisationType: OrganisationType; isActive: boolean },
  hasPaidSubscription: boolean,
): BuyBlock | null {
  if (!viewer) return 'login'
  if (viewer.role !== 'MANAGER') return 'not-manager'
  if (!canManageBilling(viewer)) return 'not-verified'
  if (viewer.organisation.status !== 'PUBLISHED') return 'not-published'
  if (!plan.isActive) return 'retired'
  if (plan.organisationType !== viewer.organisation.type) return 'wrong-type'
  if (hasPaidSubscription) return 'already-subscribed'
  return null
}

export const canBuyPlan = (...args: Parameters<typeof buyBlock>): boolean => buyBlock(...args) === null
