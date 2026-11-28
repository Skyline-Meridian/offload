import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { NotificationList } from '@/components/notifications/notification-list'
import { EmptyState } from '@/components/ui/empty-state'
import { loginWithNext, routes } from '@/lib/routes'
import { pageNotifications } from '@/server/dal/notifications'
import { getViewer } from '@/server/dal/viewer'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.notifications))
  const page = await pageNotifications(viewer.user.id)
  return (
    <main>
      <PageHeader title="Notifications" />
      <Container size="narrow" className="py-xl">
        {page.items.length === 0 ? <EmptyState title="No notifications yet" /> : <NotificationList initial={page.items} initialCursor={page.nextCursor} />}
      </Container>
    </main>
  )
}
