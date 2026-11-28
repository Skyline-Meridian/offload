import { Button, LinkButton } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { routes } from '@/lib/routes'
import type { OfferFilters as Filters } from '@/lib/validation/offer'

type Props = { filters: Filters; positions: SelectOption[]; skills: SelectOption[] }

const types: SelectOption[] = [
  { value: 'CLUB', label: 'Club' },
  { value: 'UNION', label: 'Union' },
  { value: 'INSTITUTION', label: 'College / University' },
  { value: 'BRAND', label: 'Brand' },
]

export function OfferFilters({ filters, positions, skills }: Props): React.JSX.Element {
  return (
    <form method="get" action={routes.offers} className="bg-surface flex flex-col gap-md p-md">
      <div className="grid gap-md md:grid-cols-3">
        <TextField name="q" label="Search by title" defaultValue={filters.q} />
        <TextField name="from" label="Published from" type="date" defaultValue={filters.from} />
        <TextField name="to" label="Published to" type="date" defaultValue={filters.to} />
        <Select name="organisationTypes" label="Offered by" options={types} multiple defaultValue={filters.organisationTypes} />
        <Select name="positions" label="Positions" options={positions} multiple defaultValue={filters.positions} />
        <Select name="skills" label="Skills" options={skills} multiple defaultValue={filters.skills} />
        <Select
          name="paid"
          label="Paid or unpaid"
          placeholder="Any"
          defaultValue={filters.paid}
          options={[
            { value: 'PAID', label: 'Paid' },
            { value: 'UNPAID', label: 'Unpaid' },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-sm">
        <Button type="submit">Apply</Button>
        <LinkButton href={routes.offers} variant="ghost">
          Clear filters
        </LinkButton>
      </div>
    </form>
  )
}
