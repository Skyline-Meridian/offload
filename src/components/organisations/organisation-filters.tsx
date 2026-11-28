import { Button, LinkButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import type { OrgTypeKey } from '@/lib/constants'
import type { OrganisationFilters as Filters } from '@/lib/validation/organisation'

type Props = {
  type: OrgTypeKey
  action: string
  filters: Filters
  countries: SelectOption[]
  leagues: SelectOption[]
  industries: SelectOption[]
}

/** A plain GET form: the filters live in the address. */
export function OrganisationFilters({ type, action, filters, countries, leagues, industries }: Props): React.JSX.Element {
  return (
    <form method="get" action={action} className="bg-surface flex flex-col gap-md p-md">
      <div className="grid gap-md md:grid-cols-3">
        <TextField name="q" label="Search by name" defaultValue={filters.q} />
        <Select name="country" label="Country" options={countries} placeholder="Any" defaultValue={filters.country} />
        <Select
          name="sort"
          label="Sort by"
          defaultValue={filters.sort}
          options={[
            { value: 'name', label: 'Name (A to Z)' },
            { value: 'newest', label: 'Newest' },
          ]}
        />
        {type === 'CLUB' || type === 'UNION' ? <Select name="leagues" label="League" options={leagues} multiple defaultValue={filters.leagues} /> : null}
        {type === 'INSTITUTION' ? (
          <Select
            name="institutionKind"
            label="Type"
            placeholder="Any"
            defaultValue={filters.institutionKind}
            options={[
              { value: 'COLLEGE', label: 'College' },
              { value: 'UNIVERSITY', label: 'University' },
            ]}
          />
        ) : null}
        {type === 'BRAND' ? <Select name="industry" label="Industry" options={industries} placeholder="Any" defaultValue={filters.industry} /> : null}
      </div>
      <Checkbox name="hasOffer" value="yes" defaultSelected={filters.hasOffer}>
        Has an active offer
      </Checkbox>
      <div className="flex flex-wrap gap-sm">
        <Button type="submit">Apply</Button>
        <LinkButton href={action} variant="ghost">
          Clear filters
        </LinkButton>
      </div>
    </form>
  )
}
