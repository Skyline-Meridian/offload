import 'server-only'

import type { Tx } from '@/server/db'
import { notifyRealtime } from '@/server/realtime-notify'

export type NotifyInput = {
  userIds: string[]
  /** For example "organisation.approved". */
  type: string
  linkPath?: string
  /** Name or title of the linked item, shown in the notification. */
  subjectName?: string
}

/** Adds a notification for each user and tells connected browsers. Call it inside the transaction of the change. */
export async function notify(tx: Tx, input: NotifyInput): Promise<void> {
  const userIds = [...new Set(input.userIds)]
  if (userIds.length === 0) return
  await tx.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: input.type,
      linkPath: input.linkPath ?? null,
      subjectName: input.subjectName ?? null,
    })),
  })
  for (const userId of userIds) await notifyRealtime(tx, { type: 'notification.created', userId })
}

/** Staff who should hear about work waiting for review (verification, organisations). */
export async function staffUserIds(tx: Tx): Promise<string[]> {
  const staff = await tx.user.findMany({
    where: { role: { in: ['ADMINISTRATOR', 'OFFLOAD_ADMIN'] }, status: 'ACTIVE' },
    select: { id: true },
  })
  return staff.map((s) => s.id)
}
