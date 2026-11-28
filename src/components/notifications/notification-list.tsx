'use client'

import { loadMoreNotifications } from '@/actions/notification'
import { NotificationItem } from '@/components/notifications/notification-bell'
import { InfiniteList } from '@/components/shared/infinite-list'
import { cn } from '@/lib/cn'
import type { NotificationRow } from '@/lib/view-models/messages'

type Props = { initial: NotificationRow[]; initialCursor: string | null }

export function NotificationList({ initial, initialCursor }: Props): React.JSX.Element {
  return (
    <InfiniteList
      initialItems={initial}
      initialCursor={initialCursor}
      listClassName="flex flex-col"
      loadMore={async (cursor) => {
        const page = await loadMoreNotifications(cursor)
        return page ? { items: page.items, nextCursor: page.nextCursor } : null
      }}
      renderItem={(n) => (
        <li key={n.id} className={cn('border-border border-b p-sm', !n.isRead && 'bg-surface')}>
          <NotificationItem item={n} />
        </li>
      )}
    />
  )
}
