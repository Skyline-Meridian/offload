import { Navbar } from '@/components/layout/navbar'
import { countUnreadConversations } from '@/server/dal/messaging'
import { countUnreadNotifications } from '@/server/dal/notifications'
import { getViewer } from '@/server/dal/viewer'

/** Loads the signed-in user and passes only what the navbar shows. */
export async function SiteHeader(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) return <Navbar signedInName={null} />
  const [unreadNotifications, unreadMessages] = await Promise.all([countUnreadNotifications(viewer.user.id), countUnreadConversations(viewer)])
  return (
    <Navbar
      signedInName={viewer.user.firstName ?? viewer.user.name ?? 'Account'}
      unreadNotifications={unreadNotifications}
      unreadMessages={unreadMessages}
    />
  )
}
