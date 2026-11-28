import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'

import { LinkButton } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { PlayerCard } from '@/components/players/player-card'
import { OrganisationView } from '@/components/organisations/organisation-view'
import type { OrgTypeKey } from '@/lib/constants'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { OfferCard } from '@/components/offers/offer-card'
import { listOpenOffersForOrganisation } from '@/server/dal/offers'
import { findSlugRedirect, getPublicOrganisation, listPlayersAtOrganisation } from '@/server/dal/organisations'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { canViewPlayers } from '@/server/policies/players'

async function getCachedOrganisation(type: OrgTypeKey, slug: string) {
  'use cache'
  const org = await getPublicOrganisation(type, slug)
  if (org) cacheTag(`org:${org.id}`)
  cacheLife('hours')
  return org
}

async function getCachedOpenOffers(organisationId: string) {
  'use cache'
  cacheTag(`org-offers:${organisationId}`)
  cacheLife('minutes')
  return listOpenOffersForOrganisation(organisationId)
}

async function OffersSection({ organisationId }: { organisationId: string }): Promise<React.JSX.Element | null> {
  const offers = await getCachedOpenOffers(organisationId)
  if (offers.length === 0) return null
  return (
    <section className="flex flex-col gap-xs">
      <h2 className="text-h3">Open offers</h2>
      <ul className="grid gap-md md:grid-cols-2">
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} />
        ))}
      </ul>
    </section>
  )
}

async function getCachedCountryNames(): Promise<Record<string, string>> {
  'use cache'
  cacheLife('days')
  const countries = await db.country.findMany({ select: { code: true, name: true } })
  return Object.fromEntries(countries.map((c) => [c.code, c.name]))
}

/** Metadata for the four route files. */
export async function organisationMetadata(type: OrgTypeKey, params: Promise<{ slug: string }>): Promise<Metadata> {
  const { slug } = await params
  const org = await getCachedOrganisation(type, slug)
  if (!org) return { title: 'Organisation not found' }
  const description = org.descriptionText.slice(0, 160) || `${org.name} on Offload`
  return {
    title: org.name,
    description,
    openGraph: { title: org.name, description, images: org.logoFileId ? [routes.media(org.logoFileId, 'header')] : undefined },
  }
}

async function ViewerActions({ organisationId }: { organisationId: string }): Promise<React.JSX.Element | null> {
  const viewer = await getViewer()
  if (!viewer || !viewer.user.isEmailVerified || viewer.membership?.organisationId === organisationId) return null
  return <LinkButton href={`${routes.messages}?org=${organisationId}`}>Message</LinkButton>
}

async function PlayersSection({ organisationId, type }: { organisationId: string; type: OrgTypeKey }): Promise<React.JSX.Element | null> {
  if (type === 'BRAND') return null
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <section className="flex flex-col gap-xs">
        <h2 className="text-h3">Players</h2>
        <p className="text-body">Log in to view the players at this organisation.</p>
      </section>
    )
  }
  if (!canViewPlayers(viewer)) {
    return (
      <section className="flex flex-col gap-xs">
        <h2 className="text-h3">Players</h2>
        <p className="text-body">{viewer.role === 'MANAGER' ? messages.playersNeedSubscription : messages.verificationRequired}</p>
      </section>
    )
  }
  const players = await listPlayersAtOrganisation(organisationId, type)
  if (players.length === 0) return null
  return (
    <section className="flex flex-col gap-xs">
      <h2 className="text-h3">Players</h2>
      <ul className="grid gap-md md:grid-cols-2 lg:grid-cols-4">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </ul>
    </section>
  )
}

/** The public page of one organisation. Shared by the four route files. */
export async function OrganisationPublicPage({ type, params }: { type: OrgTypeKey; params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params
  const org = await getCachedOrganisation(type, slug)
  if (!org) {
    const current = await findSlugRedirect(type, slug)
    if (current) permanentRedirect(routes.orgPage(type, current))
    notFound()
  }
  const countryNames = await getCachedCountryNames()
  return (
    <main>
      <Container className="py-xl">
        <OrganisationView
          org={org}
          countryNames={countryNames}
          actions={
            <Suspense fallback={null}>
              <ViewerActions organisationId={org.id} />
            </Suspense>
          }
          offers={
            <Suspense fallback={null}>
              <OffersSection organisationId={org.id} />
            </Suspense>
          }
          players={
            <Suspense fallback={null}>
              <PlayersSection organisationId={org.id} type={type} />
            </Suspense>
          }
        />
      </Container>
    </main>
  )
}
