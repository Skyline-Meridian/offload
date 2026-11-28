import { Navbar } from '@/components/layout/navbar'
import { getViewer } from '@/server/dal/viewer'

/** Loads the signed-in user and passes only what the navbar shows. */
export async function SiteHeader(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  return <Navbar signedInName={viewer ? (viewer.user.firstName ?? viewer.user.name ?? 'Account') : null} />
}
