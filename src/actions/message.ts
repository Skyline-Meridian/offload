'use server'

import { z } from 'zod'

import { DomainError } from '@/lib/errors'
import { formToObject } from '@/lib/form-state'
import { messages } from '@/lib/messages'
import { messageSchema } from '@/lib/validation/message'
import type { MessageRow, ThreadData } from '@/lib/view-models/messages'
import { runAsUser } from '@/server/context'
import { countUnreadConversations, getMessage, getThread, listConversations, type ConversationPage } from '@/server/dal/messaging'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { markRead, sendMessage } from '@/server/services/messaging'

export type SendResult =
  | { status: 'idle' }
  | { status: 'ok'; sent: MessageRow }
  | { status: 'error'; message?: string; fieldErrors?: Record<string, string[] | undefined> }

export async function sendMessageAction(_prev: SendResult, formData: FormData): Promise<SendResult> {
  const viewer = await getViewer()
  if (!viewer) return { status: 'error', message: messages.loginRequired }
  const parsed = messageSchema.safeParse(formToObject(formData))
  if (!parsed.success) return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  try {
    const sent = await runAsUser(viewer.user.id, viewer.role, () => sendMessage(viewer, parsed.data))
    return {
      status: 'ok',
      sent: { id: sent.id, conversationId: sent.conversationId, body: sent.body, createdAt: sent.createdAt, mine: true, senderName: '' },
    }
  } catch (error) {
    if (error instanceof DomainError) return { status: 'error', message: error.message }
    log.error('send message failed', errorInfo(error))
    return { status: 'error', message: messages.genericError }
  }
}

export async function loadMoreConversations(box: 'personal' | 'organisation', cursor: string): Promise<ConversationPage | null> {
  const viewer = await getViewer()
  return viewer ? listConversations(viewer, box, cursor) : null
}

export async function loadEarlierMessages(input: { conversationId: string; myParty: string; before: string }): Promise<ThreadData | null> {
  const viewer = await getViewer()
  if (!viewer || !z.uuid().safeParse(input.conversationId).success) return null
  return getThread(viewer, input)
}

/** For realtime: fetch one message the viewer may read, to append it to the open thread. */
export async function fetchMessage(messageId: string): Promise<(MessageRow & { myParty: string }) | null> {
  const viewer = await getViewer()
  if (!viewer || !z.uuid().safeParse(messageId).success) return null
  return getMessage(viewer, messageId)
}

/** Messages newer than the last one the browser holds, after a reconnect. */
export async function fetchThreadAfter(input: { conversationId: string; after: string }): Promise<MessageRow[]> {
  const viewer = await getViewer()
  if (!viewer || !z.uuid().safeParse(input.conversationId).success) return []
  const thread = await getThread(viewer, { conversationId: input.conversationId })
  const after = new Date(input.after).getTime()
  return thread?.messages.filter((m) => m.createdAt.getTime() > after) ?? []
}

export async function markThreadRead(conversationId: string, party: string): Promise<number> {
  const viewer = await getViewer()
  if (!viewer || !z.uuid().safeParse(conversationId).success) return 0
  try {
    await runAsUser(viewer.user.id, viewer.role, () => markRead(viewer, conversationId, party))
  } catch (error) {
    log.warn('mark read failed', errorInfo(error))
  }
  return countUnreadConversations(viewer)
}

export async function unreadMessageCount(): Promise<number> {
  const viewer = await getViewer()
  return viewer ? countUnreadConversations(viewer) : 0
}
