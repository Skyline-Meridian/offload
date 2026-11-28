'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

import { loadMoreConversations } from '@/actions/message'
import { InfiniteList } from '@/components/shared/infinite-list'
import { OrganisationLogo } from '@/components/shared/organisation-logo'
import { RelativeTime } from '@/components/shared/relative-time'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'
import type { ConversationRow } from '@/lib/view-models/messages'

type Props = {
  initial: ConversationRow[]
  initialCursor: string | null
  box: 'personal' | 'organisation'
  activeId: string | null
}

export function ConversationList({ initial, initialCursor, box, activeId }: Props): React.JSX.Element {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // New messages and reads change the list order and the unread dots: ask the server for a fresh list.
  useRealtime((event) => {
    if (event.type === 'message.created' || event.type === 'conversation.read' || event.type === 'reconnected') {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 300)
    }
  })

  const boxQuery = box === 'organisation' ? '&box=organisation' : ''
  return (
    <InfiniteList
      key={initial.map((c) => `${c.id}:${c.unread}`).join(',')}
      initialItems={initial}
      initialCursor={initialCursor}
      listClassName="flex flex-col"
      loadMore={async (cursor) => {
        const page = await loadMoreConversations(box, cursor)
        return page ? { items: page.conversations, nextCursor: page.nextCursor } : null
      }}
      renderItem={(c) => (
        <li key={c.id} className={cn('border-border border-b', c.id === activeId && 'bg-surface')}>
          <Link href={`${routes.messages}?c=${c.id}${boxQuery}`} className="flex items-center gap-sm p-sm hover:no-underline">
            {c.otherKind === 'O' ? (
              <OrganisationLogo fileId={c.otherImageFileId} name={c.otherName} variant="avatar" className="size-avatar-md" />
            ) : (
              <UserAvatar fileId={c.otherImageFileId} name={c.otherName} />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center justify-between gap-xs">
                <span className={cn('text-h5 truncate', c.unread && 'text-accent')}>{c.otherName}</span>
                <span className="text-hint shrink-0">
                  <RelativeTime date={c.lastMessageAt} />
                </span>
              </span>
              <span className="text-body truncate">{c.preview}</span>
            </span>
            {c.unread ? <span className="bg-accent size-icon-sm shrink-0 rounded-full" role="img" aria-label="Unread" /> : null}
          </Link>
        </li>
      )}
    />
  )
}
