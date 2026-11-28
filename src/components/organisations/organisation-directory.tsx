'use client'

import { loadMoreOrganisations } from '@/actions/organisation'
import { OrganisationCard } from '@/components/organisations/organisation-card'
import { InfiniteList } from '@/components/shared/infinite-list'
import type { OrganisationCardData } from '@/lib/view-models/organisations'

type Props = {
  type: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND'
  initial: OrganisationCardData[]
  initialCursor: string | null
  params: Record<string, string>
}

export function OrganisationDirectory({ type, initial, initialCursor, params }: Props): React.JSX.Element {
  return (
    <InfiniteList
      initialItems={initial}
      initialCursor={initialCursor}
      listClassName="grid gap-md md:grid-cols-2 lg:grid-cols-3"
      loadMore={async (cursor) => {
        const page = await loadMoreOrganisations(type, params, cursor)
        return page ? { items: page.organisations, nextCursor: page.nextCursor } : null
      }}
      renderItem={(o) => <OrganisationCard key={o.id} organisation={o} />}
    />
  )
}
