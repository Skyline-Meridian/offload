import type { Metadata } from 'next'

import { LoginRequired, SubscriptionRequired, VerificationRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { NoPlayers, PlayerFilters } from '@/components/players/player-filters'
import { PlayerDirectory } from '@/components/players/player-directory'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { parsePlayerFilters, toSearchParams } from '@/lib/validation/player'
import { getPlayerReferenceData, searchPlayers } from '@/server/dal/players'
import { getViewer } from '@/server/dal/viewer'
import { playersGate } from '@/server/policies/players'

export const metadata: Metadata = { title: 'Players' }

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  const gate = playersGate(viewer)
  if (gate === 'login') return <LoginRequired next={routes.players} />
  if (gate === 'verification') return <VerificationRequired isEmailVerified={viewer?.user.isEmailVerified ?? false} />
  if (gate === 'subscription') return <SubscriptionRequired message={messages.playersNeedSubscription} />

  const filters = parsePlayerFilters(await searchParams)
  const [page, reference] = await Promise.all([searchPlayers(filters), getPlayerReferenceData()])
  const params = Object.fromEntries(toSearchParams(filters))

  return (
    <main>
      <PageHeader title="Players" eyebrow="Directory">
        {page.total} {page.total === 1 ? 'player' : 'players'}
      </PageHeader>
      <Container className="flex flex-col gap-lg py-xl">
        <PlayerFilters
          filters={filters}
          positions={reference.positions.map((p) => ({ value: p.id, label: p.label }))}
          skills={reference.skills.map((s) => ({ value: s.id, label: s.label }))}
          qualifications={reference.qualifications.map((q) => ({ value: q.id, label: q.label }))}
          countries={reference.countries.map((c) => ({ value: c.code, label: c.name }))}
        />
        {page.players.length === 0 ? (
          <NoPlayers />
        ) : (
          <PlayerDirectory initialPlayers={page.players} initialCursor={page.nextCursor} params={params} />
        )}
      </Container>
    </main>
  )
}
