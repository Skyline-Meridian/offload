import { OrganisationDirectory } from '@/components/organisations/organisation-directory'
import { OrganisationFilters } from '@/components/organisations/organisation-filters'
import { LoginRequired } from '@/components/gates'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { ORG_TYPE_LABELS, type OrgTypeKey } from '@/lib/constants'
import { routes } from '@/lib/routes'
import { organisationFiltersToParams, parseOrganisationFilters } from '@/lib/validation/organisation'
import { getOrganisationReferenceData, searchOrganisations } from '@/server/dal/organisations'
import { getViewer } from '@/server/dal/viewer'

const titles: Record<OrgTypeKey, string> = { CLUB: 'Clubs', UNION: 'Unions', INSTITUTION: 'Colleges and universities', BRAND: 'Brands' }

/** The directory of one organisation type. Shared by the four route files. */
export async function OrganisationDirectoryPage({
  type,
  searchParams,
}: {
  type: OrgTypeKey
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  const path = routes.orgDirectory(type)
  if (!viewer) return <LoginRequired next={path} />

  const filters = parseOrganisationFilters(await searchParams)
  const [page, reference] = await Promise.all([searchOrganisations(type, filters), getOrganisationReferenceData()])
  const params = Object.fromEntries(organisationFiltersToParams(filters))

  return (
    <main>
      <PageHeader title={titles[type]} eyebrow={ORG_TYPE_LABELS[type]}>
        {page.total} {page.total === 1 ? 'result' : 'results'}
      </PageHeader>
      <Container className="flex flex-col gap-lg py-xl">
        <OrganisationFilters
          type={type}
          action={path}
          filters={filters}
          countries={reference.countries.map((c) => ({ value: c.code, label: c.name }))}
          leagues={reference.leagues.map((l) => ({ value: l.id, label: l.name }))}
          industries={reference.industries.map((i) => ({ value: i.id, label: i.label }))}
        />
        {page.organisations.length === 0 ? (
          <EmptyState title="No results found">Try changing your filters.</EmptyState>
        ) : (
          <OrganisationDirectory type={type} initial={page.organisations} initialCursor={page.nextCursor} params={params} />
        )}
      </Container>
    </main>
  )
}
