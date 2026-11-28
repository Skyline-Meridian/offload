import type { Metadata } from 'next'

import { OrganisationDirectoryPage } from '@/app/(platform)/organisation-directory-page'

export const metadata: Metadata = { title: 'Clubs' }

export default function ClubsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<React.JSX.Element> {
  return OrganisationDirectoryPage({ type: 'CLUB', searchParams })
}
