'use client'

import { useState } from 'react'

import { addNewOrganisation, claimExistingOrganisation } from '@/actions/organisation'
import { FormMessage } from '@/components/forms/form-message'
import { OrganisationPicker } from '@/components/forms/organisation-picker'
import { SubmitButton } from '@/components/forms/submit-button'
import { NewOrganisationFields } from '@/components/organisations/new-organisation-fields'
import { Card } from '@/components/ui/card'
import { Select, type SelectOption } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'
import type { OrgTypeKey } from '@/lib/constants'

const typeOptions: SelectOption[] = [
  { value: 'CLUB', label: 'Club' },
  { value: 'UNION', label: 'Union' },
  { value: 'INSTITUTION', label: 'College / University' },
  { value: 'BRAND', label: 'Brand' },
]

type Props = { countries: SelectOption[]; industries: SelectOption[] }

/** Shown to a manager with no current organisation (03 section 7.1). */
export function AddOrClaim({ countries, industries }: Props): React.JSX.Element {
  const [type, setType] = useState<OrgTypeKey | ''>('')
  const add = useSection(addNewOrganisation)
  const claim = useSection(claimExistingOrganisation)
  return (
    <div className="flex flex-col gap-lg">
      <Select name="type" label="Organisation type" options={typeOptions} placeholder="Choose…" onValueChange={(v) => setType(v as OrgTypeKey | '')} />
      {type ? (
        <>
          <Card as="section">
            <h2 className="text-h4">Register a new organisation</h2>
            <form action={add.formAction} className="flex flex-col gap-md" noValidate>
              <FormMessage state={add.state} />
              <input type="hidden" name="type" value={type} />
              <NewOrganisationFields key={type} type={type} countries={countries} industries={industries} allowClaim={false} errors={add.errors} />
              <SubmitButton className="self-start">Register organisation</SubmitButton>
            </form>
          </Card>
          <Card as="section">
            <h2 className="text-h4">Claim an existing organisation</h2>
            <form action={claim.formAction} className="flex flex-col gap-md" noValidate>
              <FormMessage state={claim.state} />
              <OrganisationPicker key={type} name="organisationId" label="Organisation" type={type} errors={claim.errors('organisationId')} hint="You will manage it only after Offload approves your request." />
              <SubmitButton className="self-start">Send claim</SubmitButton>
            </form>
          </Card>
        </>
      ) : null}
    </div>
  )
}
