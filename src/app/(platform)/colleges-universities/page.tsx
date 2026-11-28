import type { Metadata } from 'next'

import { OrganisationDirectoryPage } from '@/app/(platform)/organisation-directory-page'

export const metadata: Metadata = { title: 'Colleges and universities' }

export default function InstitutionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<React.JSX.Element> {
  return OrganisationDirectoryPage({ type: 'INSTITUTION', searchParams })
}
