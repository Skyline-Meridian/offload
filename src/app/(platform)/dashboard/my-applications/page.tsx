import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PlayerApplications } from '@/components/applications/applications-table'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { loginWithNext, routes } from '@/lib/routes'
import { listApplicationsForPlayer } from '@/server/dal/applications'
import { getViewer } from '@/server/dal/viewer'

export const metadata: Metadata = { title: 'My applications' }

export default async function MyApplicationsPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myApplications))
  if (viewer.role !== 'PLAYER') notFound()
  const rows = await listApplicationsForPlayer(viewer.user.id)
  return (
    <main>
      <PageHeader title="My applications" eyebrow="Player" />
      <Container className="py-xl">{rows.length === 0 ? <EmptyState title="No applications yet">Find an offer and apply.</EmptyState> : <PlayerApplications rows={rows} />}</Container>
    </main>
  )
}
