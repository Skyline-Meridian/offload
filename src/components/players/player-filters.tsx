import Link from 'next/link'

import { Button, LinkButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { routes } from '@/lib/routes'
import type { PlayerFilters as Filters, RangeKey } from '@/lib/validation/player'

type Props = {
  filters: Filters
  positions: SelectOption[]
  skills: SelectOption[]
  qualifications: SelectOption[]
  countries: SelectOption[]
}

const yesNo: SelectOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

const rangeFields: { key: RangeKey; label: string }[] = [
  { key: 'age', label: 'Age' },
  { key: 'height', label: 'Height (cm)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'maxSpeed', label: 'Max speed (m/s)' },
  { key: 'broadJump', label: 'Broad jump (cm)' },
  { key: 'test1200', label: '1200 m time (s)' },
  { key: 'cmj', label: 'CMJ (cm)' },
  { key: 'bench1rm', label: 'Bench press 1RM (kg)' },
  { key: 'squat1rm', label: 'Squat 1RM (kg)' },
]

function yn(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? 'yes' : 'no'
}

/** The filter form. It is a plain GET form, so the filters live in the address and work without scripts. */
export function PlayerFilters({ filters, positions, skills, qualifications, countries }: Props): React.JSX.Element {
  const hasFilters =
    Boolean(filters.q || filters.primaryPosition || filters.club || filters.contractFrom || filters.contractTo) ||
    [filters.nationality, filters.anyPosition, filters.eligible, filters.qualification, filters.rugbyCode, filters.skills].some((l) => l.length) ||
    [filters.capped, filters.keenToRelocate, filters.retired, filters.brandPartnership].some((v) => v !== undefined) ||
    Object.keys(filters.ranges).length > 0

  return (
    <details className="bg-surface p-md" open={hasFilters}>
      <summary className="text-h4 cursor-pointer">Filters</summary>
      <form method="get" action={routes.players} className="mt-md flex flex-col gap-md">
        <TextField name="q" label="Search by name" defaultValue={filters.q} />
        <div className="grid gap-md md:grid-cols-3">
          {rangeFields.map(({ key, label }) => (
            <fieldset key={key} className="flex flex-col gap-2xs">
              <legend className="text-label">{label}</legend>
              <div className="grid grid-cols-2 gap-xs">
                <TextField name={`${key}Min`} label="From" type="number" defaultValue={filters.ranges[key]?.min?.toString()} />
                <TextField name={`${key}Max`} label="To" type="number" defaultValue={filters.ranges[key]?.max?.toString()} />
              </div>
            </fieldset>
          ))}
        </div>
        <div className="grid gap-md md:grid-cols-3">
          <Select name="primaryPosition" label="Primary position" options={positions} placeholder="Any" defaultValue={filters.primaryPosition} />
          <Select name="anyPosition" label="Any position" options={positions} multiple defaultValue={filters.anyPosition} />
          <Select name="nationality" label="Nationality" options={countries} multiple defaultValue={filters.nationality} />
          <Select name="eligible" label="Eligible to play for" options={countries} multiple defaultValue={filters.eligible} />
          <Select name="qualification" label="Qualification" options={qualifications} multiple defaultValue={filters.qualification} />
          <Select
            name="rugbyCode"
            label="League or union"
            multiple
            defaultValue={filters.rugbyCode}
            options={[
              { value: 'LEAGUE_ONLY', label: 'League only' },
              { value: 'UNION_ONLY', label: 'Union only' },
              { value: 'BOTH', label: 'Both' },
            ]}
          />
          <Select name="capped" label="Capped" options={yesNo} placeholder="Any" defaultValue={yn(filters.capped)} />
          <Select name="keenToRelocate" label="Keen to relocate" options={yesNo} placeholder="Any" defaultValue={yn(filters.keenToRelocate)} />
          <Select name="retired" label="Retired" options={yesNo} placeholder="Any" defaultValue={yn(filters.retired)} />
          <Select name="brandPartnership" label="Open to brand partnerships" options={yesNo} placeholder="Any" defaultValue={yn(filters.brandPartnership)} />
          <TextField name="club" label="Current club" defaultValue={filters.club} />
          <TextField name="contractFrom" label="Contract ends from" type="date" defaultValue={filters.contractFrom} />
          <TextField name="contractTo" label="Contract ends to" type="date" defaultValue={filters.contractTo} />
        </div>
        <Select name="skills" label="Skills" options={skills} multiple defaultValue={filters.skills} />
        <Checkbox name="skillsMode" value="all" defaultSelected={filters.skillsMode === 'all'}>
          Player must have all the chosen skills
        </Checkbox>
        <Select
          name="sort"
          label="Sort by"
          defaultValue={filters.sort}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
          ]}
        />
        <div className="flex flex-wrap gap-sm">
          <Button type="submit">Apply</Button>
          <LinkButton href={routes.players} variant="ghost">
            Clear filters
          </LinkButton>
        </div>
      </form>
    </details>
  )
}

export function NoPlayers(): React.JSX.Element {
  return (
    <div className="bg-surface flex flex-col items-center gap-sm p-xl text-center">
      <p className="text-h4">No players match your filters</p>
      <Link href={routes.players} className="text-link">
        Clear filters
      </Link>
    </div>
  )
}
