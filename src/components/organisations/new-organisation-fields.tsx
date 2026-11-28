'use client'

import { useState } from 'react'

import { checkDuplicateOrganisations } from '@/actions/organisation'
import { OrganisationPicker } from '@/components/forms/organisation-picker'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { fieldLabel } from '@/lib/validation/organisation'
import type { OrgTypeKey } from '@/lib/constants'
import type { OrganisationPickerOption } from '@/lib/view-models/organisations'

type Props = {
  type: OrgTypeKey
  countries: SelectOption[]
  industries: SelectOption[]
  errors?: (name: string) => string[] | undefined
  /** Prefix of the field names: "org" in the registration form (orgName), "" in the dashboard form (name). */
  prefix?: string
  /** Show the choice between adding a new organisation and claiming an existing one. */
  allowClaim?: boolean
}

function fieldName(prefix: string, name: string): string {
  return prefix ? `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}` : name
}

/** The short form for a new organisation, with the "Is this your organisation?" check, or a claim picker. */
export function NewOrganisationFields({ type, countries, industries, errors, prefix = '', allowClaim = true }: Props): React.JSX.Element {
  const [mode, setMode] = useState<'new' | 'claim'>('new')
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [registration, setRegistration] = useState('')
  const [industry, setIndustry] = useState('')
  const [duplicates, setDuplicates] = useState<OrganisationPickerOption[]>([])
  const [claimOption, setClaimOption] = useState<OrganisationPickerOption | undefined>()
  const f = (n: string): string => fieldName(prefix, n)
  const e = (n: string): string[] | undefined => errors?.(f(n))

  const check = (): void => {
    void checkDuplicateOrganisations({ type, name, country, registrationNumber: registration }).then((found) =>
      setDuplicates(found.map((d) => ({ id: d.id, name: d.name, city: d.city }))),
    )
  }

  return (
    <fieldset className="flex flex-col gap-md">
      <legend className="text-h4">Your organisation</legend>
      <input type="hidden" name="orgMode" value={mode} />
      {allowClaim ? (
        <div className="flex flex-wrap gap-md" role="radiogroup" aria-label="Add or claim">
          <label className="text-body flex items-center gap-2xs">
            <input type="radio" name="orgModeChoice" checked={mode === 'new'} onChange={() => setMode('new')} />
            Register a new organisation
          </label>
          <label className="text-body flex items-center gap-2xs">
            <input type="radio" name="orgModeChoice" checked={mode === 'claim'} onChange={() => setMode('claim')} />
            Claim an existing organisation
          </label>
        </div>
      ) : null}

      {mode === 'claim' ? (
        <OrganisationPicker
          key={claimOption?.id ?? 'none'}
          name="organisationId"
          label="Organisation"
          type={type}
          defaultOption={claimOption}
          errors={errors?.('organisationId')}
          hint="You will manage it only after Offload approves your request."
        />
      ) : (
        <>
          <TextField name={f('name')} label={fieldLabel(type, 'name')} value={name} onChange={setName} onBlur={check} isRequired errors={e('name')} />
          <Select
            name={f('country')}
            label="Country"
            options={countries}
            placeholder="Choose…"
            required
            onValueChange={(value) => {
              setCountry(value)
              if (name) setTimeout(check, 0)
            }}
            errors={e('country')}
          />
          {duplicates.length > 0 ? (
            <Alert variant="warning">
              <p className="text-body">Is this your organisation?</p>
              <ul className="flex flex-col gap-2xs pt-xs">
                {duplicates.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-sm">
                    <span>
                      {d.name}
                      {d.city ? `, ${d.city}` : ''}
                    </span>
                    {allowClaim ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          setClaimOption(d)
                          setMode('claim')
                        }}
                      >
                        Claim this organisation instead
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {type !== 'BRAND' ? (
            <TextField
              name={f('registrationNumber')}
              label={fieldLabel(type, 'registrationNumber')}
              value={registration}
              onChange={setRegistration}
              isRequired
              errors={e('registrationNumber')}
            />
          ) : null}
          {type === 'INSTITUTION' ? (
            <Select
              name={f('institutionKind')}
              label="Type"
              options={[
                { value: 'COLLEGE', label: 'College' },
                { value: 'UNIVERSITY', label: 'University' },
              ]}
              placeholder="Choose…"
              required
              errors={e('institutionKind')}
            />
          ) : null}
          {type === 'BRAND' ? (
            <>
              <TextField name={f('website')} label="Website" isRequired errors={e('website')} />
              <Select name={f('industryId')} label="Industry" options={industries} placeholder="Choose…" required onValueChange={setIndustry} errors={e('industryId')} />
              {industry === 'other' ? <TextField name={f('industryOther')} label="Tell us your industry" isRequired errors={e('industryOther')} /> : null}
            </>
          ) : null}
          <TextField name={f('officialEmail')} label="Official email" type="email" errors={e('officialEmail')} />
          <TextField name={f('officialPhone')} label="Official phone" type="tel" errors={e('officialPhone')} />
        </>
      )}
    </fieldset>
  )
}
