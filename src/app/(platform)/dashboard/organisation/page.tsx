import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { AddOrClaim } from '@/components/organisations/add-or-claim'
import { toOrganisationEditorData } from '@/components/organisations/editor/editor-data'
import { OrganisationEditor } from '@/components/organisations/editor/organisation-editor'
import { Alert } from '@/components/ui/alert'
import { loginWithNext, routes } from '@/lib/routes'
import { getOrganisationReferenceData, getOwnOrganisation } from '@/server/dal/organisations'
import { getViewer } from '@/server/dal/viewer'
import { canEditOrganisation } from '@/server/policies/organisations'

export const metadata: Metadata = { title: 'My organisation' }

export default async function OrganisationPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.myOrganisation))
  if (viewer.role !== 'MANAGER') notFound()

  const reference = await getOrganisationReferenceData()
  const countries = reference.countries.map((c) => ({ value: c.code, label: c.name }))
  const industries = reference.industries.map((i) => ({ value: i.id, label: i.label }))
  const membership = viewer.membership

  // No current organisation: add one or claim one.
  if (!membership || membership.status === 'REJECTED') {
    return (
      <main>
        <PageHeader title="My organisation" eyebrow="Manager">
          {membership?.status === 'REJECTED' ? 'Your last request was not approved. You can add or claim another organisation.' : 'Add your organisation or claim one that is already on Offload.'}
        </PageHeader>
        <Container size="narrow" className="py-xl">
          <AddOrClaim countries={countries} industries={industries} />
        </Container>
      </main>
    )
  }

  const organisation = await getOwnOrganisation(membership.organisationId)
  if (!organisation) notFound()

  // A claim waits for staff; the manager cannot edit until it is approved.
  if (!canEditOrganisation(viewer, organisation)) {
    return (
      <main>
        <PageHeader title={organisation.name} eyebrow="Manager" />
        <Container size="narrow" className="py-xl">
          <Alert>Your request to manage this organisation is waiting for Offload to review it.</Alert>
        </Container>
      </main>
    )
  }

  return (
    <main>
      <PageHeader title={organisation.name} eyebrow="My organisation" />
      <Container size="narrow" className="py-xl">
        <OrganisationEditor
          data={toOrganisationEditorData(organisation, viewer.user.id)}
          reference={{
            countries,
            industries,
            leagues: reference.leagues.map((l) => ({ value: l.id, label: l.name })),
          }}
        />
      </Container>
    </main>
  )
}
