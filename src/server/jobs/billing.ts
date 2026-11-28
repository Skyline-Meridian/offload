import 'server-only'

import { GRACE_DAYS, subscriptionGrantsAccess } from '@/lib/subscription-access'
import { db } from '@/server/db'
import { notifyManagers } from '@/server/services/billing/notify'

const DAY = 86_400_000

/** A one-day window starting `days` from now (negative = in the past), in UTC days. */
function dayWindow(days: number, now: Date): { gte: Date; lt: Date } {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + days * DAY
  return { gte: new Date(start), lt: new Date(start + DAY) }
}

/** Returns true only the first time: the reminder row is inserted before anything is sent (06 design section 5.7). */
async function claimReminder(subscriptionId: string, kind: string): Promise<boolean> {
  const inserted = await db.$executeRaw`
    INSERT INTO "BillingReminder" ("subscriptionId", "kind", "createdAt") VALUES (${subscriptionId}::uuid, ${kind}, now())
    ON CONFLICT DO NOTHING`
  return inserted > 0
}

const hasPaid = async (organisationId: string): Promise<boolean> =>
  (await db.subscription.count({ where: { organisationId, kind: 'PAID', status: { not: 'ENDED' } } })) > 0

/** Daily at 09:00: ends trials, ends grace periods, sends reminders. Safe to run twice. */
export async function billing(): Promise<Record<string, number>> {
  const now = new Date()
  const counts = { trialsEnded: 0, accessStopped: 0, reminders: 0 }

  // 1. Trials that reached their end date. A paid subscription bought during the trial takes over without emails.
  const trials = await db.subscription.findMany({ where: { kind: 'TRIAL', status: 'TRIALING', currentPeriodEnd: { lte: now } }, include: { plan: true } })
  for (const trial of trials) {
    await db.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: trial.id }, data: { status: 'ENDED', endedReason: 'TRIAL_ENDED', accessEndedAt: trial.currentPeriodEnd } })
      const takenOver = (await tx.subscription.count({ where: { organisationId: trial.organisationId, kind: 'PAID', status: { not: 'ENDED' } } })) > 0
      if (!takenOver) await notifyManagers(tx, trial.organisationId, 'billing.ended', { planName: trial.plan.name, date: trial.currentPeriodEnd, notificationType: 'billing.trial-ended' })
    })
    counts.trialsEnded += 1
  }

  // 2. Grace period over: access has already stopped by the clock; record it and tell the managers once.
  const pastDue = await db.subscription.findMany({ where: { kind: 'PAID', status: 'PAST_DUE', accessEndedAt: null, pastDueSince: { not: null } }, include: { plan: true } })
  for (const sub of pastDue) {
    const graceEnds = new Date(sub.pastDueSince!.getTime() + GRACE_DAYS * DAY)
    if (graceEnds > now) continue
    await db.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: sub.id }, data: { accessEndedAt: graceEnds } })
      await notifyManagers(tx, sub.organisationId, 'billing.access-stopped', { planName: sub.plan.name, date: graceEnds, notificationType: 'billing.access-stopped' })
    })
    counts.accessStopped += 1
  }

  // 3. Reminders
  for (const [days, kind] of [[7, 'TRIAL_7'], [1, 'TRIAL_1']] as const) {
    const due = await db.subscription.findMany({ where: { kind: 'TRIAL', status: 'TRIALING', currentPeriodEnd: dayWindow(days, now) }, include: { plan: true } })
    for (const sub of due) {
      if (await hasPaid(sub.organisationId)) continue
      if (!(await claimReminder(sub.id, kind))) continue
      await db.$transaction((tx) => notifyManagers(tx, sub.organisationId, 'billing.trial-ending', { planName: sub.plan.name, date: sub.currentPeriodEnd, link: '/pricing', notificationType: 'billing.trial-ending' }))
      counts.reminders += 1
    }
  }
  for (const [days, kind] of [[14, 'RENEWAL_14'], [7, 'RENEWAL_7'], [1, 'RENEWAL_1']] as const) {
    const due = await db.subscription.findMany({
      where: { kind: 'PAID', status: { in: ['ACTIVE', 'TRIALING'] }, isCancelledAtPeriodEnd: false, plan: { interval: 'YEAR' }, currentPeriodEnd: dayWindow(days, now) },
      include: { plan: true },
    })
    for (const sub of due) {
      if (!(await claimReminder(sub.id, kind))) continue
      const price = sub.planPriceId ? await db.planPrice.findUnique({ where: { id: sub.planPriceId }, select: { amountPence: true } }) : null
      await db.$transaction((tx) => notifyManagers(tx, sub.organisationId, 'billing.renewal-near', { planName: sub.plan.name, amountPence: price?.amountPence, date: sub.currentPeriodEnd, notificationType: 'billing.renewal-near' }))
      counts.reminders += 1
    }
  }
  for (const [days, kind] of [[1, 'AGAIN_1'], [2, 'AGAIN_2'], [7, 'AGAIN_7'], [30, 'AGAIN_30'], [180, 'AGAIN_180']] as const) {
    const ended = await db.subscription.findMany({ where: { accessEndedAt: dayWindow(-days, now) }, include: { plan: true, organisation: { select: { status: true } } } })
    for (const sub of ended) {
      if (sub.organisation.status !== 'PUBLISHED') continue
      const all = await db.subscription.findMany({ where: { organisationId: sub.organisationId, status: { not: 'ENDED' } }, select: { kind: true, status: true, currentPeriodEnd: true, pastDueSince: true } })
      if (subscriptionGrantsAccess('PUBLISHED', all, now)) continue
      const later = await db.subscription.count({ where: { organisationId: sub.organisationId, createdAt: { gt: sub.createdAt } } })
      if (later > 0) continue
      if (!(await claimReminder(sub.id, kind))) continue
      await db.$transaction((tx) => notifyManagers(tx, sub.organisationId, 'billing.subscribe-again', { planName: sub.plan.name, link: '/pricing', notificationType: 'billing.subscribe-again' }))
      counts.reminders += 1
    }
  }
  return counts
}
