import type { Metadata } from 'next'

import { OrganisationPublicPage, organisationMetadata } from '@/app/(public)/organisation-public-page'

type Props = { params: Promise<{ slug: string }> }

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return organisationMetadata('BRAND', params)
}

export default function BrandPage({ params }: Props): Promise<React.JSX.Element> {
  return OrganisationPublicPage({ type: 'BRAND', params })
}
