import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LoginRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { ApplyBox } from '@/components/offers/apply-box'
import { OfferView } from '@/components/offers/offer-view'
import { routes } from '@/lib/routes'
import { getPlayerApplicationStatus } from '@/server/dal/applications'
import { getOfferPage } from '@/server/dal/offers'
import { getViewer } from '@/server/dal/viewer'
import { canApply } from '@/server/policies/offers'

export const metadata: Metadata = { title: 'Offer' }

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const viewer = await getViewer()
  if (!viewer) return <LoginRequired next={routes.offer(id)} />

  const offer = await getOfferPage(id, { allowAnyStatusForOrganisationId: viewer.organisation?.id })
  if (!offer) notFound()

  let mode: 'login' | 'apply' | 'applied' | 'reapply' | 'verify' | 'none' = 'none'
  let status: string | undefined
  if (viewer.role === 'PLAYER') {
    const existing = await getPlayerApplicationStatus(viewer.user.id, id)
    const open = canApply(viewer, { status: offer.status, expiresAt: offer.expiresAt, organisationStatus: offer.organisationStatus })
    if (existing && existing !== 'WITHDRAWN') {
      mode = 'applied'
      status = existing
    } else if (open) {
      mode = existing === 'WITHDRAWN' ? 'reapply' : 'apply'
    } else if (offer.status === 'PUBLISHED' && (!viewer.isVerified || !viewer.user.isEmailVerified)) {
      mode = 'verify'
    }
  }

  return (
    <main>
      <Container size="narrow" className="py-xl">
        <OfferView offer={offer} apply={<ApplyBox offerId={id} mode={mode} status={status} />} />
      </Container>
    </main>
  )
}
