import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { ManagerOffers } from '@/components/offers/manager-offers'
import { Alert } from '@/components/ui/alert'
import { LinkButton } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { loginWithNext, routes } from '@/lib/routes'
import { listOrganisationOffers } from '@/server/dal/offers'
import { getViewer } from '@/server/dal/viewer'
import { canManageOffers } from '@/server/policies/offers'

export const metadata: Metadata = { title: 'My offers' }

export default async function MyOffersPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myOffers))
  if (!canManageOffers(viewer)) {
    return (
      <main>
        <PageHeader title="My offers" eyebrow="Manager" />
        <Container size="narrow" className="py-xl">
          <Alert variant="warning">You can create offers once your organisation is approved and published.</Alert>
        </Container>
      </main>
    )
  }
  const offers = await listOrganisationOffers(viewer.organisation.id)
  return (
    <main>
      <PageHeader title="My offers" eyebrow="Manager" />
      <Container className="flex flex-col gap-lg py-xl">
        <LinkButton href={`${routes.myOffers}/new`} className="self-start">
          New offer
        </LinkButton>
        {offers.length === 0 ? <EmptyState title="No offers yet">Create your first offer to start receiving applications.</EmptyState> : <ManagerOffers offers={offers} />}
      </Container>
    </main>
  )
}
