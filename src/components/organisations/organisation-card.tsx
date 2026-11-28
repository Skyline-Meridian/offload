import Link from 'next/link'

import { OrganisationLogo } from '@/components/shared/organisation-logo'
import { routes } from '@/lib/routes'
import type { OrganisationCardData } from '@/lib/view-models/organisations'

export function OrganisationCard({ organisation, countryName }: { organisation: OrganisationCardData; countryName?: string }): React.JSX.Element {
  return (
    <li className="bg-white border-thin border-border">
      <Link href={routes.orgPage(organisation.type, organisation.slug)} className="flex items-center gap-sm p-sm hover:no-underline">
        <OrganisationLogo fileId={organisation.logoFileId} name={organisation.name} variant="avatar" />
        <span className="flex flex-col">
          <span className="text-h4">{organisation.name}</span>
          <span className="text-eyebrow">{organisation.typeLabel}</span>
          <span className="text-hint">{[organisation.city, countryName ?? organisation.country].filter(Boolean).join(', ')}</span>
        </span>
      </Link>
    </li>
  )
}
