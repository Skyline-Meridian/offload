'use server'

import { revalidatePath } from 'next/cache'

import type { NotificationRow } from '@/lib/view-models/messages'
import { runAsUser } from '@/server/context'
import { countUnreadNotifications, listNotifications, pageNotifications, type NotificationPage } from '@/server/dal/notifications'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'

export async function loadNotificationPanel(): Promise<{ items: NotificationRow[]; unread: number } | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  const items = await listNotifications(viewer.user.id, 20)
  return { items, unread: await countUnreadNotifications(viewer.user.id) }
}

/** Opening the panel marks everything in it as read. */
export async function markAllRead(ids: string[]): Promise<number> {
  const viewer = await getViewer()
  if (!viewer) return 0
  const safe = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100)
  if (safe.length > 0) {
    await runAsUser(viewer.user.id, viewer.role, () =>
      db.notification.updateMany({ where: { userId: viewer.user.id, id: { in: safe }, readAt: null }, data: { readAt: new Date() } }),
    )
  }
  revalidatePath('/dashboard/notifications')
  return countUnreadNotifications(viewer.user.id)
}

export async function unreadNotificationCount(): Promise<number> {
  const viewer = await getViewer()
  return viewer ? countUnreadNotifications(viewer.user.id) : 0
}

export async function loadMoreNotifications(cursor: string): Promise<NotificationPage | null> {
  const viewer = await getViewer()
  return viewer ? pageNotifications(viewer.user.id, cursor) : null
}
