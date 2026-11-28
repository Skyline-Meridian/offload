import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { OfferForm } from '@/components/offers/offer-form'
import { loginWithNext, routes } from '@/lib/routes'
import { getOfferReferenceData } from '@/server/dal/offers'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { canManageOffers } from '@/server/policies/offers'

export const metadata: Metadata = { title: 'New offer' }

export default async function NewOfferPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(`${routes.myOffers}/new`))
  if (!canManageOffers(viewer)) notFound()
  const [reference, org] = await Promise.all([
    getOfferReferenceData(),
    db.organisation.findUnique({ where: { id: viewer.organisation.id }, select: { mapAddress: true, placeId: true } }),
  ])
  return (
    <main>
      <PageHeader title="New offer" eyebrow="Manager" />
      <Container size="narrow" className="py-xl">
        <OfferForm
          positions={reference.positions.map((p) => ({ value: p.id, label: p.label }))}
          skills={reference.skills.map((s) => ({ value: s.id, label: s.label }))}
          defaultLocation={{ text: org?.mapAddress ?? '', placeId: org?.placeId ?? '' }}
        />
      </Container>
    </main>
  )
}
