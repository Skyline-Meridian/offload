import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LoginRequired, SubscriptionRequired, VerificationRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { PlayerProfileView } from '@/components/players/player-profile-view'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { getPlayerProfile } from '@/server/dal/players'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { canViewCv, canViewPlayerProfile, playersGate } from '@/server/policies/players'

export const metadata: Metadata = { title: 'Player profile' }

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const viewer = await getViewer()
  const profile = await getPlayerProfile(id)
  const isOwn = Boolean(viewer && profile && profile.userId === viewer.user.id)

  // The owner and staff may always see the profile; everyone else goes through the directory gate.
  if (!isOwn && !viewer?.isStaff) {
    const gate = playersGate(viewer)
    if (gate === 'login') return <LoginRequired next={routes.player(id)} />
    if (gate === 'verification') return <VerificationRequired isEmailVerified={viewer?.user.isEmailVerified ?? false} />
    if (gate === 'subscription') return <SubscriptionRequired message={messages.playersNeedSubscription} />
  }
  if (!profile || !canViewPlayerProfile(viewer, { userId: profile.userId, isListed: profile.isListed })) notFound()

  const codes = [...new Set([...profile.nationalities, ...profile.countries.map((c) => c.country)])]
  const countries = await db.country.findMany({ where: { code: { in: codes } }, select: { code: true, name: true } })

  return (
    <main>
      <Container className="py-xl">
        <PlayerProfileView
          profile={profile}
          isOwn={isOwn}
          canMessage={!isOwn && Boolean(viewer?.user.isEmailVerified)}
          canViewCv={canViewCv(viewer, profile.userId)}
          countryNames={Object.fromEntries(countries.map((c) => [c.code, c.name]))}
        />
      </Container>
    </main>
  )
}
