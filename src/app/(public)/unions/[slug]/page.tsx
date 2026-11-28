import type { Metadata } from 'next'

import { OrganisationPublicPage, organisationMetadata } from '@/app/(public)/organisation-public-page'

type Props = { params: Promise<{ slug: string }> }

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return organisationMetadata('UNION', params)
}

export default function UnionPage({ params }: Props): Promise<React.JSX.Element> {
  return OrganisationPublicPage({ type: 'UNION', params })
}
