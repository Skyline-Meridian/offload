import type { Metadata } from 'next'

import { LoginRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { OfferDirectory } from '@/components/offers/offer-directory'
import { OfferFilters } from '@/components/offers/offer-filters'
import { EmptyState } from '@/components/ui/empty-state'
import { routes } from '@/lib/routes'
import { offerFiltersToParams, parseOfferFilters } from '@/lib/validation/offer'
import { getOfferReferenceData, searchOffers } from '@/server/dal/offers'
import { getViewer } from '@/server/dal/viewer'

export const metadata: Metadata = { title: 'Offers' }

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) return <LoginRequired next={routes.offers} />
  const filters = parseOfferFilters(await searchParams)
  const [page, reference] = await Promise.all([searchOffers(filters), getOfferReferenceData()])
  return (
    <main>
      <PageHeader title="Offers" eyebrow="Opportunities">
        {page.total} {page.total === 1 ? 'offer' : 'offers'}
      </PageHeader>
      <Container className="flex flex-col gap-lg py-xl">
        <OfferFilters
          filters={filters}
          positions={reference.positions.map((p) => ({ value: p.id, label: p.label }))}
          skills={reference.skills.map((s) => ({ value: s.id, label: s.label }))}
        />
        {page.offers.length === 0 ? (
          <EmptyState title="No offers found">Try changing your filters.</EmptyState>
        ) : (
          <OfferDirectory initial={page.offers} initialCursor={page.nextCursor} params={Object.fromEntries(offerFiltersToParams(filters))} />
        )}
      </Container>
    </main>
  )
}
