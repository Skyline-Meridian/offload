import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { ManagerApplications } from '@/components/applications/applications-table'
import { SubscriptionRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { Button, LinkButton } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { loginWithNext, routes } from '@/lib/routes'
import { listApplicationsForOrganisation, listOffersForFilter } from '@/server/dal/applications'
import { getViewer } from '@/server/dal/viewer'
import { canManageOffers, canViewApplications } from '@/server/policies/offers'

export const metadata: Metadata = { title: 'Applications' }

const statuses = ['SUBMITTED', 'SHORTLISTED', 'CONTACTED', 'REJECTED'] as const

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.applications))
  if (!canManageOffers(viewer)) notFound()
  if (!canViewApplications(viewer)) return <SubscriptionRequired message="Subscribe to view applications" />

  const params = await searchParams
  const offerId = typeof params.offerId === 'string' && /^[0-9a-f-]{36}$/i.test(params.offerId) ? params.offerId : undefined
  const status = statuses.find((s) => s === params.status)
  const [rows, offers] = await Promise.all([
    listApplicationsForOrganisation(viewer.organisation.id, { offerId, status }),
    listOffersForFilter(viewer.organisation.id),
  ])
  return (
    <main>
      <PageHeader title="Applications" eyebrow="Manager" />
      <Container className="flex flex-col gap-lg py-xl">
        <form method="get" className="bg-surface flex flex-wrap items-end gap-md p-md">
          <Select name="offerId" label="Offer" options={offers.map((o) => ({ value: o.id, label: o.title }))} placeholder="All offers" defaultValue={offerId} />
          <Select name="status" label="Status" options={statuses.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} placeholder="Any" defaultValue={status} />
          <Button type="submit">Apply</Button>
          <LinkButton href={routes.applications} variant="ghost">
            Clear
          </LinkButton>
        </form>
        {rows.length === 0 ? <EmptyState title="No applications yet" /> : <ManagerApplications rows={rows} />}
      </Container>
    </main>
  )
}
