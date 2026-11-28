import 'server-only'

import { randomUUID } from 'node:crypto'

import { DomainError } from '@/lib/errors'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { pairKey, parsePartyKey, partyKey } from '@/lib/validation/message'
import type { Viewer } from '@/server/dal/viewer'
import { db, type Tx } from '@/server/db'
import { sendEmail } from '@/server/email/send'
import { notify } from '@/server/notify'
import { canMessage, canWriteAsOrganisation, inboxPartiesFor, ownsParty } from '@/server/policies/messaging'
import { hit } from '@/server/rate-limit'
import { notifyRealtime } from '@/server/realtime-notify'
import { env } from '@/server/env'

type Party = { kind: 'U' | 'O'; id: string }

function partyRow(party: Party): { kind: 'USER' | 'ORGANISATION'; userId: string | null; organisationId: string | null } {
  return party.kind === 'U'
    ? { kind: 'USER', userId: party.id, organisationId: null }
    : { kind: 'ORGANISATION', userId: null, organisationId: party.id }
}

/** One conversation per pair of parties, even when two people start it at the same moment. */
export async function findOrCreateConversation(tx: Tx, a: Party, b: Party): Promise<string> {
  const key = pairKey(partyKey(a.kind, a.id), partyKey(b.kind, b.id))
  const rows = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO "Conversation" ("id", "pairKey", "lastMessageAt", "createdAt", "updatedAt")
    VALUES (${randomUUID()}::uuid, ${key}, now(), now(), now())
    ON CONFLICT ("pairKey") DO UPDATE SET "pairKey" = EXCLUDED."pairKey"
    RETURNING "id"`
  const id = rows[0]!.id
  await tx.conversationParty.createMany({
    data: [a, b].map((p) => ({ conversationId: id, ...partyRow(p) })),
    skipDuplicates: true,
  })
  return id
}

/** Who gets told about a message to this party: the user, or every active manager of the organisation. */
async function recipientsOf(tx: Tx, party: Party): Promise<{ id: string; email: string; firstName: string | null }[]> {
  if (party.kind === 'U') {
    const user = await tx.user.findFirst({ where: { id: party.id, status: 'ACTIVE' }, select: { id: true, email: true, firstName: true } })
    return user ? [user] : []
  }
  const members = await tx.organisationMember.findMany({
    where: { organisationId: party.id, status: 'ACTIVE', user: { status: 'ACTIVE' } },
    select: { user: { select: { id: true, email: true, firstName: true } } },
  })
  return members.map((m) => m.user)
}

export type SentMessage = { id: string; conversationId: string; body: string; createdAt: Date }

/** Writes a message, updates unread counts, notifies the recipients and publishes the realtime event (04 section 5.2). */
export async function sendMessage(
  viewer: Viewer,
  input: { target: string; asOrganisation: boolean; body: string },
): Promise<SentMessage> {
  if (!canMessage(viewer)) throw new DomainError('not-allowed', 'Verify your email before sending messages.')
  const target = parsePartyKey(input.target)
  if (!target) throw new DomainError('bad-target', 'Choose who to message.')
  if (input.asOrganisation && !canWriteAsOrganisation(viewer)) throw new DomainError('not-allowed', messages.notAllowed)

  const hour = await hit('messagesHour', viewer.user.id)
  const day = await hit('messagesDay', viewer.user.id)
  if (!hour.allowed || !day.allowed) throw new DomainError('rate-limited', messages.tooManyRequests)

  const senderParty: Party = input.asOrganisation
    ? { kind: 'O', id: viewer.organisation!.id }
    : { kind: 'U', id: viewer.user.id }
  if (senderParty.kind === target.kind && senderParty.id === target.id) {
    throw new DomainError('bad-target', 'You cannot message yourself.')
  }
  // A manager writing from the personal inbox to their own organisation (or the reverse) is also refused.
  if (ownsParty(viewer, input.target)) throw new DomainError('bad-target', 'You cannot message your own organisation.')

  return db.$transaction(async (tx) => {
    if (target.kind === 'O') {
      const org = await tx.organisation.findFirst({ where: { id: target.id, status: 'PUBLISHED', deletedAt: null }, select: { id: true } })
      if (!org) throw new DomainError('not-found', 'This organisation is not available.')
    }
    const recipients = await recipientsOf(tx, target)
    if (recipients.length === 0) throw new DomainError('not-found', 'This person cannot receive messages.')

    const conversationId = await findOrCreateConversation(tx, senderParty, target)
    const message = await tx.message.create({
      data: {
        conversationId,
        senderUserId: viewer.user.id,
        senderOrgId: input.asOrganisation ? viewer.organisation!.id : null,
        body: input.body,
      },
    })
    const targetRow = partyRow(target)
    await tx.conversationParty.updateMany({
      where: { conversationId, kind: targetRow.kind, userId: targetRow.userId, organisationId: targetRow.organisationId },
      data: { unreadCount: { increment: 1 } },
    })
    // The sender has read everything up to their own message.
    const senderRow = partyRow(senderParty)
    await tx.conversationParty.updateMany({
      where: { conversationId, kind: senderRow.kind, userId: senderRow.userId, organisationId: senderRow.organisationId },
      data: { unreadCount: 0, lastReadAt: message.createdAt },
    })
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } })

    const senderName = input.asOrganisation
      ? (await tx.organisation.findUniqueOrThrow({ where: { id: viewer.organisation!.id }, select: { name: true } })).name
      : `${viewer.user.firstName ?? ''} ${viewer.user.lastName ?? ''}`.trim() || 'Someone'
    await notify(tx, {
      userIds: recipients.map((r) => r.id),
      type: 'message.new',
      linkPath: `${routes.messages}?c=${conversationId}`,
      subjectName: senderName,
    })
    for (const recipient of recipients) {
      await sendEmail(tx, {
        type: 'message.new',
        to: recipient.email,
        userId: recipient.id,
        variables: {
          firstName: recipient.firstName ?? 'there',
          senderName,
          link: `${env.APP_URL}${routes.messages}?c=${conversationId}`,
        },
        // The worker checks these before sending: skip if the message was read, or one was sent lately.
        context: { conversationId, messageId: message.id, partyKey: input.target },
      })
    }
    await notifyRealtime(tx, {
      type: 'message.created',
      conversationId,
      messageId: message.id,
      parties: [partyKey(senderParty.kind, senderParty.id), input.target],
    })
    return { id: message.id, conversationId, body: message.body, createdAt: message.createdAt }
  })
}

/** Opening a thread marks it read for the viewer's party (shared by all managers of an organisation). */
export async function markRead(viewer: Viewer, conversationId: string, party: string): Promise<void> {
  if (!ownsParty(viewer, party)) throw new DomainError('not-allowed', messages.notAllowed)
  const parsed = parsePartyKey(party)
  if (!parsed) return
  const row = partyRow(parsed)
  await db.$transaction(async (tx) => {
    const result = await tx.conversationParty.updateMany({
      where: { conversationId, kind: row.kind, userId: row.userId, organisationId: row.organisationId, unreadCount: { gt: 0 } },
      data: { unreadCount: 0, lastReadAt: new Date() },
    })
    if (result.count > 0) {
      await notifyRealtime(tx, { type: 'conversation.read', conversationId, parties: [party] })
    }
  })
}

export { inboxPartiesFor }
