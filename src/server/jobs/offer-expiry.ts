import 'server-only'

import { revalidateTag } from 'next/cache'

import { db } from '@/server/db'
import { notify } from '@/server/notify'
import { managersToNotify } from '@/server/services/organisations/members'

/** Hourly: expire offers whose date has passed, and remind managers 3 days before. Safe to run twice. */
export async function offerExpiry(): Promise<Record<string, number>> {
  const expired = await db.$queryRaw<{ id: string; organisationId: string; title: string | null }[]>`
    UPDATE "Offer" SET "status" = 'EXPIRED', "updatedAt" = now()
    WHERE "status" = 'PUBLISHED' AND "expiresAt" <= now()
    RETURNING "id", "organisationId", "title"`
  for (const offer of expired) {
    await db.$transaction(async (tx) => {
      await notify(tx, {
        userIds: await managersToNotify(tx, offer.organisationId),
        type: 'offer.expired',
        linkPath: '/dashboard/offers',
        subjectName: offer.title ?? 'Offer',
      })
    })
    revalidateTag(`org-offers:${offer.organisationId}`, 'max')
  }

  const reminders = await db.$queryRaw<{ id: string; organisationId: string; title: string | null }[]>`
    UPDATE "Offer" SET "expiryReminderSentAt" = now()
    WHERE "status" = 'PUBLISHED' AND "expiresAt" <= now() + interval '3 days' AND "expiryReminderSentAt" IS NULL
    RETURNING "id", "organisationId", "title"`
  for (const offer of reminders) {
    await db.$transaction(async (tx) => {
      await notify(tx, {
        userIds: await managersToNotify(tx, offer.organisationId),
        type: 'offer.expiring',
        linkPath: '/dashboard/offers',
        subjectName: offer.title ?? 'Offer',
      })
    })
  }
  return { expired: expired.length, reminded: reminders.length }
}
