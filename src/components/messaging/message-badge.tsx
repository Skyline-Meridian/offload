'use client'

import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'

import { unreadMessageCount } from '@/actions/message'
import { Icon } from '@/components/ui/icon'
import { useRealtime } from '@/hooks/use-realtime'
import { routes } from '@/lib/routes'

/** The messages icon in the navbar, with the number of conversations that have unread messages. */
export function MessageBadge({ initialUnread }: { initialUnread: number }): React.JSX.Element {
  const [unread, setUnread] = useState(initialUnread)
  const refresh = useCallback(() => {
    void unreadMessageCount().then(setUnread)
  }, [])
  useRealtime((event) => {
    if (event.type === 'message.created' || event.type === 'conversation.read' || event.type === 'reconnected' || event.type === 'membership.changed') refresh()
  })
  return (
    <Link href={routes.messages} aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'} className="text-heading hover:text-accent relative p-2xs">
      <Icon icon={MessageSquare} size="lg" />
      {unread > 0 ? (
        <span className="bg-accent text-white text-hint absolute -right-2xs -top-2xs flex min-w-icon-sm items-center justify-center rounded-full px-2xs">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  )
}
