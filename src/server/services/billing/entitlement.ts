import 'server-only'

import { subscriptionGrantsAccess } from '@/lib/subscription-access'
import { db } from '@/server/db'

/** True when the organisation is published and has a trial, a paid plan or a grace period running. */
export async function hasActiveSubscription(organisationId: string, now: Date = new Date()): Promise<boolean> {
  const organisation = await db.organisation.findUnique({
    where: { id: organisationId },
    select: {
      status: true,
      subscriptions: {
        where: { status: { not: 'ENDED' } },
        select: { kind: true, status: true, currentPeriodEnd: true, pastDueSince: true },
      },
    },
  })
  if (!organisation) return false
  return subscriptionGrantsAccess(organisation.status, organisation.subscriptions, now)
}
