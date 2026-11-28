import 'server-only'

import { PAGE_SIZE } from '@/lib/constants'
import type { NotificationRow } from '@/lib/view-models/messages'
import { db } from '@/server/db'

const labels: Record<string, string> = {
  'application.new': 'You have a new application',
  'application.new_locked': 'You have a new application. Subscribe to view it',
  'application.status': 'The status of your application changed',
  'message.new': 'New message',
  'offer.expiring': 'Your offer expires in 3 days',
  'offer.expired': 'Your offer has expired',
  'offer.closed_by_staff': 'Your offer was closed by Offload',
  'organisation.unpublished': 'Your organisation was unpublished',
  'organisation.republished': 'Your organisation is published again',
  'organisation.approved': 'Your organisation was approved',
  'organisation.rejected': 'Your organisation was not approved',
  'verification.approved': 'Your verification was approved',
  'verification.rejected': 'Your verification was not approved',
  'verification.organisation-pending': 'An organisation is waiting for review',
  'verification.claim-pending': 'A claim is waiting for review',
  'verification.manager-pending': 'A manager is waiting for review',
  'verification.player-pending': 'A player is waiting for review',
  'organisation.change-requested': 'An organisation asked for a change',
}

export function notificationLabel(type: string): string {
  return labels[type] ?? 'You have a new notification'
}

type Row = { id: string; type: string; subjectName: string | null; linkPath: string | null; createdAt: Date; readAt: Date | null }

function toRow(r: Row): NotificationRow {
  return { id: r.id, type: r.type, label: notificationLabel(r.type), subjectName: r.subjectName, linkPath: r.linkPath, createdAt: r.createdAt, isRead: r.readAt !== null }
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } })
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationRow[]> {
  const rows = await db.notification.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit })
  return rows.map(toRow)
}

export type NotificationPage = { items: NotificationRow[]; nextCursor: string | null }

export async function pageNotifications(userId: string, cursor?: string): Promise<NotificationPage> {
  let cursorWhere: object = {}
  if (cursor) {
    try {
      const [iso, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string]
      const at = new Date(iso)
      cursorWhere = { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: id } }] }
    } catch {
      cursorWhere = {}
    }
  }
  const rows = await db.notification.findMany({
    where: { userId, ...cursorWhere },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
  })
  const hasMore = rows.length > PAGE_SIZE
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const last = page.at(-1)
  return {
    items: page.map(toRow),
    nextCursor: hasMore && last ? Buffer.from(JSON.stringify([last.createdAt.toISOString(), last.id])).toString('base64url') : null,
  }
}
