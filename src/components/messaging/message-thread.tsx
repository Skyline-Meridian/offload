'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useOptimistic, useRef, useState } from 'react'

import { fetchMessage, fetchThreadAfter, loadEarlierMessages, markThreadRead, sendMessageAction, type SendResult } from '@/actions/message'
import { SubmitButton } from '@/components/forms/submit-button'
import { RelativeTime } from '@/components/shared/relative-time'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'
import { linkify, MESSAGE_MAX_LENGTH } from '@/lib/validation/message'
import type { MessageRow, ThreadData } from '@/lib/view-models/messages'

function Body({ text }: { text: string }): React.JSX.Element {
  return (
    <p className="text-body whitespace-pre-wrap break-words">
      {linkify(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} className="text-link" rel="nofollow noopener noreferrer" target="_blank">
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  )
}

function merge(current: MessageRow[], extra: MessageRow[]): MessageRow[] {
  const seen = new Set(current.map((m) => m.id))
  const added = extra.filter((m) => !seen.has(m.id))
  return added.length === 0 ? current : [...current, ...added].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

type Props = {
  thread: ThreadData
  /** The box the viewer is in: replies from the organisation inbox are sent as the organisation. */
  box: 'personal' | 'organisation'
  canSend: boolean
}

export function MessageThread({ thread, box, canSend }: Props): React.JSX.Element {
  const router = useRouter()
  const [messages, setMessages] = useState(thread.messages)
  const [hasEarlier, setHasEarlier] = useState(thread.hasEarlier)
  const [conversationId, setConversationId] = useState(thread.conversationId)
  const [optimistic, addOptimistic] = useOptimistic(messages, (current, pending: MessageRow) => [...current, pending])
  const bottom = useRef<HTMLDivElement>(null)

  const [state, formAction] = useActionState<SendResult, FormData>(
    async (previous, formData) => {
      addOptimistic({
        id: `pending-${Date.now()}`,
        conversationId: conversationId ?? '',
        body: String(formData.get('body') ?? ''),
        createdAt: new Date(),
        mine: true,
        senderName: '',
      })
      const result = await sendMessageAction(previous, formData)
      if (result.status === 'ok') {
        setMessages((current) => merge(current, [result.sent]))
        if (!conversationId) setConversationId(result.sent.conversationId)
      }
      return result
    },
    { status: 'idle' },
  )

  // A first message creates the conversation: move to its address so the page shows it from the server too.
  useEffect(() => {
    if (state.status === 'ok' && !thread.conversationId) router.replace(`${routes.messages}?c=${state.sent.conversationId}${box === 'organisation' ? '&box=organisation' : ''}`)
  }, [state, thread.conversationId, router, box])

  // Mark the thread read when it opens.
  useEffect(() => {
    if (thread.conversationId) void markThreadRead(thread.conversationId, thread.myParty)
  }, [thread.conversationId, thread.myParty])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [optimistic.length])

  useRealtime((event) => {
    if (!conversationId) return
    if (event.type === 'message.created' && event.conversationId === conversationId) {
      void fetchMessage(event.messageId).then((message) => {
        if (!message) return
        setMessages((current) => merge(current, [message]))
        if (!message.mine) void markThreadRead(conversationId, thread.myParty)
      })
    }
    if (event.type === 'reconnected') {
      const last = messages.at(-1)
      void fetchThreadAfter({ conversationId, after: (last?.createdAt ?? new Date(0)).toISOString() }).then((missed) => {
        if (missed.length > 0) setMessages((current) => merge(current, missed))
      })
    }
  })

  const loadEarlier = async (): Promise<void> => {
    const first = messages[0]
    if (!conversationId || !first) return
    const page = await loadEarlierMessages({ conversationId, myParty: thread.myParty, before: first.createdAt.toISOString() })
    if (!page) return
    setMessages((current) => merge(current, page.messages))
    setHasEarlier(page.hasEarlier)
  }

  const errors = state.status === 'error' ? state.fieldErrors : undefined
  return (
    <div className="flex h-full min-h-0 flex-col gap-sm">
      <div className="flex-1 overflow-y-auto" aria-live="polite">
        {hasEarlier ? (
          <Button variant="ghost" size="sm" className="mb-sm" onPress={() => void loadEarlier()}>
            Load earlier messages
          </Button>
        ) : null}
        {optimistic.length === 0 ? <p className="text-hint">No messages yet. Say hello.</p> : null}
        <ul className="flex flex-col gap-xs">
          {optimistic.map((m) => (
            <li key={m.id} className={cn('flex max-w-prose flex-col p-xs', m.mine ? 'bg-surface self-end' : 'border-thin border-border self-start')}>
              <Body text={m.body} />
              <span className="text-hint">
                {m.mine ? 'You' : m.senderName}
                {' · '}
                <RelativeTime date={m.createdAt} />
              </span>
            </li>
          ))}
        </ul>
        <div ref={bottom} />
      </div>
      {canSend ? (
        <form action={formAction} className="flex flex-col gap-xs" noValidate>
          {state.status === 'error' && state.message ? <Alert variant="error">{state.message}</Alert> : null}
          <input type="hidden" name="target" value={thread.otherParty} />
          {box === 'organisation' ? <input type="hidden" name="asOrganisation" value="on" /> : null}
          <TextField name="body" label="Message" multiline rows={3} errors={errors?.body} maxLength={MESSAGE_MAX_LENGTH} />
          <SubmitButton className="self-start">Send</SubmitButton>
        </form>
      ) : (
        <Alert variant="warning">Verify your email to send messages.</Alert>
      )}
    </div>
  )
}
