import type { OrganisationStatus, SubscriptionKind, SubscriptionStatus } from '@/generated/prisma/client'

export const GRACE_DAYS = 7

export type SubscriptionFacts = {
  kind: SubscriptionKind
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  pastDueSince: Date | null
}

/**
 * The access rule from design 06 section 4.1. Pure, so it can be tested with a fixed `now`.
 * An organisation that is not PUBLISHED never has access. PAUSED and ENDED never count.
 */
export function subscriptionGrantsAccess(
  organisationStatus: OrganisationStatus,
  subscriptions: readonly SubscriptionFacts[],
  now: Date,
): boolean {
  if (organisationStatus !== 'PUBLISHED') return false
  return subscriptions.some((s) => {
    if (s.kind === 'TRIAL') return s.status === 'TRIALING' && s.currentPeriodEnd !== null && now < s.currentPeriodEnd
    if (s.status === 'TRIALING' || s.status === 'ACTIVE') return true
    if (s.status === 'PAST_DUE' && s.pastDueSince) {
      return now.getTime() < s.pastDueSince.getTime() + GRACE_DAYS * 86_400_000
    }
    return false
  })
}
