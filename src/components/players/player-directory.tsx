'use client'

import { loadMorePlayers } from '@/actions/player'
import { PlayerCard } from '@/components/players/player-card'
import { InfiniteList } from '@/components/shared/infinite-list'
import type { PlayerCardData } from '@/lib/view-models/players'

type Props = {
  initialPlayers: PlayerCardData[]
  initialCursor: string | null
  /** The active filters as plain search params, passed back to the server for the next pages. */
  params: Record<string, string>
}

export function PlayerDirectory({ initialPlayers, initialCursor, params }: Props): React.JSX.Element {
  return (
    <InfiniteList
      initialItems={initialPlayers}
      initialCursor={initialCursor}
      listClassName="grid gap-md md:grid-cols-2 lg:grid-cols-4"
      loadMore={async (cursor) => {
        const page = await loadMorePlayers(params, cursor)
        return page ? { items: page.players, nextCursor: page.nextCursor } : null
      }}
      renderItem={(player) => <PlayerCard key={player.id} player={player} />}
    />
  )
}
