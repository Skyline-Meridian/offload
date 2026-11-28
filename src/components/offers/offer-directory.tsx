'use client'

import { loadMoreOffers } from '@/actions/offer'
import { OfferCard } from '@/components/offers/offer-card'
import { InfiniteList } from '@/components/shared/infinite-list'
import type { OfferCardData } from '@/lib/view-models/offers'

type Props = { initial: OfferCardData[]; initialCursor: string | null; params: Record<string, string> }

export function OfferDirectory({ initial, initialCursor, params }: Props): React.JSX.Element {
  return (
    <InfiniteList
      initialItems={initial}
      initialCursor={initialCursor}
      listClassName="grid gap-md md:grid-cols-2"
      loadMore={async (cursor) => {
        const page = await loadMoreOffers(params, cursor)
        return page ? { items: page.offers, nextCursor: page.nextCursor } : null
      }}
      renderItem={(o) => <OfferCard key={o.id} offer={o} />}
    />
  )
}
