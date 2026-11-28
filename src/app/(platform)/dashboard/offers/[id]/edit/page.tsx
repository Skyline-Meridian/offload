import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { OfferForm } from '@/components/offers/offer-form'
import { loginWithNext, routes } from '@/lib/routes'
import { getOfferForEdit, getOfferReferenceData } from '@/server/dal/offers'
import { getViewer } from '@/server/dal/viewer'
import { canEditOffer } from '@/server/policies/offers'

export const metadata: Metadata = { title: 'Edit offer' }

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(`${routes.myOffers}/${id}/edit`))
  if (!/^[0-9a-f-]{36}$/i.test(id) || !viewer.organisation) notFound()
  const [offer, reference] = await Promise.all([getOfferForEdit(viewer.organisation.id, id), getOfferReferenceData()])
  if (!offer || !canEditOffer(viewer, { organisationId: viewer.organisation.id, status: offer.status })) notFound()
  return (
    <main>
      <PageHeader title="Edit offer" eyebrow="Manager" />
      <Container size="narrow" className="py-xl">
        <OfferForm
          offer={offer}
          positions={reference.positions.map((p) => ({ value: p.id, label: p.label }))}
          skills={reference.skills.map((s) => ({ value: s.id, label: s.label }))}
        />
      </Container>
    </main>
  )
}
