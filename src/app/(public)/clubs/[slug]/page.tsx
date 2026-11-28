import type { Metadata } from 'next'

import { OrganisationPublicPage, organisationMetadata } from '@/app/(public)/organisation-public-page'

type Props = { params: Promise<{ slug: string }> }

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return organisationMetadata('CLUB', params)
}

export default function ClubPage({ params }: Props): Promise<React.JSX.Element> {
  return OrganisationPublicPage({ type: 'CLUB', params })
}
