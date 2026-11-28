import 'server-only'

import type { Prisma } from '@/generated/prisma/client'
import { pairKey, parsePartyKey, partyKey } from '@/lib/validation/message'
import type { ConversationRow, MessageRow, ThreadData } from '@/lib/view-models/messages'
import { db } from '@/server/db'
import type { Viewer } from '@/server/dal/viewer'
import { inboxPartiesFor, ownsParty } from '@/server/policies/messaging'

const PAGE = 30
const THREAD_PAGE = 50

type PartyRow = {
  kind: 'USER' | 'ORGANISATION'
  userId: string | null
  organisationId: string | null
  unreadCount: number
}

function keyOf(p: { kind: 'USER' | 'ORGANISATION'; userId: string | null; organisationId: string | null }): string {
  return p.kind === 'USER' ? partyKey('U', p.userId!) : partyKey('O', p.organisationId!)
}

/** Name and image of a party. Deleted users and organisations are shown as tombstones. */
export async function describeParty(party: string): Promise<{ name: string; imageFileId: string | null; kind: 'U' | 'O' } | null> {
  const parsed = parsePartyKey(party)
  if (!parsed) return null
  if (parsed.kind === 'U') {
    const user = await db.user.findUnique({ where: { id: parsed.id }, select: { firstName: true, lastName: true, status: true, profilePictureId: true } })
    if (!user || user.status === 'DELETED') return { name: 'Deleted user', imageFileId: null, kind: 'U' }
    return { name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Offload user', imageFileId: user.profilePictureId, kind: 'U' }
  }
  const org = await db.organisation.findUnique({ where: { id: parsed.id }, select: { name: true, logoFileId: true, deletedAt: true } })
  if (!org || org.deletedAt) return { name: 'Deleted organisation', imageFileId: null, kind: 'O' }
  return { name: org.name, imageFileId: org.logoFileId, kind: 'O' }
}

// ─── Conversation list ──────────────────────────────────────────────────

export type ConversationPage = { conversations: ConversationRow[]; nextCursor: string | null; unreadTotal: number }

export async function listConversations(viewer: Viewer, box: 'personal' | 'organisation', cursor?: string): Promise<ConversationPage> {
  const parties = inboxPartiesFor(viewer)
  const mine = box === 'organisation' ? parties.organisation : parties.personal
  if (!mine) return { conversations: [], nextCursor: null, unreadTotal: 0 }
  const parsed = parsePartyKey(mine)!
  const partyWhere: Prisma.ConversationPartyWhereInput =
    parsed.kind === 'U' ? { kind: 'USER', userId: parsed.id } : { kind: 'ORGANISATION', organisationId: parsed.id }

  let cursorWhere: Prisma.ConversationWhereInput | undefined
  if (cursor) {
    try {
      const [iso, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string]
      const at = new Date(iso)
      cursorWhere = { OR: [{ lastMessageAt: { lt: at } }, { lastMessageAt: at, id: { lt: id } }] }
    } catch {
      cursorWhere = undefined
    }
  }
  const where: Prisma.ConversationWhereInput = { parties: { some: partyWhere }, messages: { some: {} }, ...(cursorWhere ?? {}) }

  const [rows, unread] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: PAGE + 1,
      select: {
        id: true,
        lastMessageAt: true,
        parties: { select: { kind: true, userId: true, organisationId: true, unreadCount: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true } },
      },
    }),
    db.conversationParty.aggregate({ where: { ...partyWhere, unreadCount: { gt: 0 } }, _count: true }),
  ])
  const hasMore = rows.length > PAGE
  const page = hasMore ? rows.slice(0, PAGE) : rows
  const result: ConversationRow[] = []
  for (const row of page) {
    const mineRow = row.parties.find((p: PartyRow) => keyOf(p) === mine)
    const other = row.parties.find((p: PartyRow) => keyOf(p) !== mine)
    if (!other) continue
    const otherKey = keyOf(other)
    const info = await describeParty(otherKey)
    result.push({
      id: row.id,
      myParty: mine,
      otherParty: otherKey,
      otherName: info?.name ?? 'Deleted user',
      otherImageFileId: info?.imageFileId ?? null,
      otherKind: info?.kind ?? 'U',
      preview: (row.messages[0]?.body ?? '').slice(0, 80),
      lastMessageAt: row.lastMessageAt,
      unread: (mineRow?.unreadCount ?? 0) > 0,
    })
  }
  const last = page.at(-1)
  return {
    conversations: result,
    nextCursor: hasMore && last ? Buffer.from(JSON.stringify([last.lastMessageAt.toISOString(), last.id])).toString('base64url') : null,
    unreadTotal: unread._count,
  }
}

/** Unread conversations across the personal and organisation inboxes, for the navbar badge. */
export async function countUnreadConversations(viewer: Viewer): Promise<number> {
  const parties = inboxPartiesFor(viewer)
  const or: Prisma.ConversationPartyWhereInput[] = [{ kind: 'USER', userId: viewer.user.id }]
  if (parties.organisation) or.push({ kind: 'ORGANISATION', organisationId: parsePartyKey(parties.organisation)!.id })
  return db.conversationParty.count({ where: { OR: or, unreadCount: { gt: 0 } } })
}

// ─── Thread ─────────────────────────────────────────────────────────────

async function toRows(rows: { id: string; conversationId: string; body: string; createdAt: Date; senderUserId: string; senderOrgId: string | null; sender: { firstName: string | null; lastName: string | null } }[], viewer: Viewer, myParty: string): Promise<MessageRow[]> {
  const mineOrg = parsePartyKey(myParty)?.kind === 'O'
  return rows.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    body: m.body,
    createdAt: m.createdAt,
    mine: mineOrg ? m.senderOrgId === parsePartyKey(myParty)!.id : m.senderUserId === viewer.user.id && m.senderOrgId === null,
    senderName: `${m.sender.firstName ?? ''} ${m.sender.lastName ?? ''}`.trim() || 'Offload user',
  }))
}

const messageSelect = {
  id: true,
  conversationId: true,
  body: true,
  createdAt: true,
  senderUserId: true,
  senderOrgId: true,
  sender: { select: { firstName: true, lastName: true } },
} satisfies Prisma.MessageSelect

/**
 * The thread between the viewer's channel and another party. `other` is used when there is no conversation yet
 * (a new thread from a "Message" button). Returns null when the viewer has no right to it.
 */
export async function getThread(
  viewer: Viewer,
  input: { conversationId?: string; other?: string; myParty?: string; before?: string },
): Promise<ThreadData | null> {
  const parties = inboxPartiesFor(viewer)
  let conversationId = input.conversationId ?? null
  let myParty = input.myParty && ownsParty(viewer, input.myParty) ? input.myParty : parties.personal
  let otherParty = input.other ?? ''

  if (conversationId) {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { parties: { select: { kind: true, userId: true, organisationId: true, unreadCount: true } } },
    })
    if (!conversation) return null
    const keys = conversation.parties.map((p: PartyRow) => keyOf(p))
    const own = keys.find((k: string) => ownsParty(viewer, k) && (!input.myParty || k === myParty)) ?? keys.find((k: string) => ownsParty(viewer, k))
    if (!own) return null
    myParty = own
    otherParty = keys.find((k: string) => k !== own) ?? ''
  } else if (otherParty && parsePartyKey(otherParty)) {
    const existing = await db.conversation.findUnique({ where: { pairKey: pairKey(myParty, otherParty) }, select: { id: true } })
    conversationId = existing?.id ?? null
  } else {
    return null
  }

  const info = await describeParty(otherParty)
  if (!info) return null
  let before: Date | undefined
  if (input.before) {
    const parsed = new Date(input.before)
    if (!Number.isNaN(parsed.getTime())) before = parsed
  }
  const rows = conversationId
    ? await db.message.findMany({
        where: { conversationId, ...(before ? { createdAt: { lt: before } } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: THREAD_PAGE + 1,
        select: messageSelect,
      })
    : []
  const hasEarlier = rows.length > THREAD_PAGE
  const page = (hasEarlier ? rows.slice(0, THREAD_PAGE) : rows).reverse()
  return {
    conversationId,
    otherName: info.name,
    otherImageFileId: info.imageFileId,
    otherParty,
    myParty,
    messages: await toRows(page, viewer, myParty),
    hasEarlier,
  }
}

/** One message, for appending live. The viewer must own one of the two channels. */
export async function getMessage(viewer: Viewer, messageId: string): Promise<(MessageRow & { myParty: string }) | null> {
  const row = await db.message.findUnique({
    where: { id: messageId },
    select: { ...messageSelect, conversation: { select: { parties: { select: { kind: true, userId: true, organisationId: true } } } } },
  })
  if (!row) return null
  const keys = row.conversation.parties.map((p) => keyOf({ ...p, unreadCount: 0 } as PartyRow))
  const own = keys.find((k) => ownsParty(viewer, k))
  if (!own) return null
  const [mapped] = await toRows([row], viewer, own)
  return mapped ? { ...mapped, myParty: own } : null
}

/** Target info for the "Message" buttons: `?to=<userId>`, `?to=U:<id>`, `?to=O:<id>` or `?org=<id>`. */
export function normaliseTarget(params: Record<string, string | string[] | undefined>): string | null {
  const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)
  const org = one(params.org)
  if (org && /^[0-9a-f-]{36}$/i.test(org)) return partyKey('O', org.toLowerCase())
  const to = one(params.to)
  if (!to) return null
  if (parsePartyKey(to)) return to
  return /^[0-9a-f-]{36}$/i.test(to) ? partyKey('U', to.toLowerCase()) : null
}
