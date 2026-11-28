'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from 'react-aria-components'

import { loadNotificationPanel, markAllRead, unreadNotificationCount } from '@/actions/notification'
import { RelativeTime } from '@/components/shared/relative-time'
import { Icon } from '@/components/ui/icon'
import { Spinner } from '@/components/ui/spinner'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'
import type { NotificationRow } from '@/lib/view-models/messages'

export function NotificationBell({ initialUnread }: { initialUnread: number }): React.JSX.Element {
  const [unread, setUnread] = useState(initialUnread)
  const [items, setItems] = useState<NotificationRow[] | null>(null)

  const refreshCount = useCallback(() => {
    void unreadNotificationCount().then(setUnread)
  }, [])
  useRealtime((event) => {
    if (event.type === 'notification.created' || event.type === 'reconnected') refreshCount()
  })

  const onOpenChange = (open: boolean): void => {
    if (!open) return
    setItems(null)
    void loadNotificationPanel().then(async (panel) => {
      if (!panel) return
      setItems(panel.items)
      const ids = panel.items.filter((i) => !i.isRead).map((i) => i.id)
      if (ids.length > 0) setUnread(await markAllRead(ids))
    })
  }

  return (
    <DialogTrigger onOpenChange={onOpenChange}>
      <AriaButton aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} className="text-heading hover:text-accent relative p-2xs">
        <Icon icon={Bell} size="lg" />
        {unread > 0 ? (
          <span className="bg-accent text-white text-hint absolute -right-2xs -top-2xs flex min-w-icon-sm items-center justify-center rounded-full px-2xs">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </AriaButton>
      <Popover placement="bottom end" className="bg-white border-thin border-border shadow-overlay z-overlay w-menu-wide max-w-full">
        <Dialog aria-label="Notifications" className="flex flex-col gap-xs p-sm outline-none">
          <h2 className="text-h5">Notifications</h2>
          {items === null ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p className="text-body">No notifications yet.</p>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => (
                <li key={n.id} className={cn('border-border border-b py-xs last:border-b-0', !n.isRead && 'bg-surface')}>
                  <NotificationItem item={n} />
                </li>
              ))}
            </ul>
          )}
          <Link href={routes.notifications} className="text-link">
            See all notifications
          </Link>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}

export function NotificationItem({ item }: { item: NotificationRow }): React.JSX.Element {
  const content = (
    <span className="flex flex-col">
      <span className="text-body text-heading">{item.label}</span>
      {item.subjectName ? <span className="text-body">{item.subjectName}</span> : null}
      <span className="text-hint">
        <RelativeTime date={item.createdAt} />
      </span>
    </span>
  )
  return item.linkPath ? (
    <Link href={item.linkPath} className="block hover:no-underline">
      {content}
    </Link>
  ) : (
    content
  )
}
