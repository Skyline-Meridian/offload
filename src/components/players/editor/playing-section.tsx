'use client'

import { useState } from 'react'

import { savePlaying } from '@/actions/player'
import { OrganisationPicker } from '@/components/forms/organisation-picker'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { SectionCard } from '@/components/players/editor/section-card'
import type { EditorData, EditorReference } from '@/components/players/editor/types'
import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'

const rugbyCodes = [
  { value: 'LEAGUE_ONLY', label: 'League only' },
  { value: 'UNION_ONLY', label: 'Union only' },
  { value: 'BOTH', label: 'Both' },
]

type LinkedProps = {
  idName: string
  textName: string
  label: string
  id: string
  text: string
  name: string
  errors?: string[]
}

/** Pick an organisation on Offload, or type a name when it is not there. Picking one clears the typed text. */
function OrganisationText({ idName, textName, label, id, text, name, errors, type }: LinkedProps & { type: 'CLUB' | 'UNION' | 'INSTITUTION' }): React.JSX.Element {
  const [linked, setLinked] = useState(Boolean(id))
  return (
    <div className="flex flex-col gap-xs">
      <OrganisationPicker
        name={idName}
        label={label}
        type={type}
        defaultOption={id ? { id, name, city: null } : undefined}
        onChange={(option) => setLinked(option !== null)}
        hint="Search organisations on Offload. If it is not there, type the name below."
      />
      {!linked ? <TextField name={textName} label={`${label} (name, if not on Offload)`} defaultValue={text} errors={errors} /> : null}
    </div>
  )
}

export function PlayingSection({ data, reference }: { data: EditorData['playing']; reference: EditorReference }): React.JSX.Element {
  const { state, formAction, errors } = useSection(savePlaying)
  const soft = reference.skills.filter((s) => s.kind === 'SOFT')
  const game = reference.skills.filter((s) => s.kind === 'GAME')
  return (
    <SectionCard id="playing" title="Playing information">
      <form action={formAction} className="flex flex-col gap-md" noValidate>
        <FormMessage state={state} />
        <div className="grid gap-md md:grid-cols-3">
          <Select name="primaryPositionId" label="Primary position" options={reference.positions} placeholder="Choose…" defaultValue={data.primaryPositionId} />
          <Select name="secondaryPositionId" label="Secondary position" options={reference.positions} placeholder="Choose…" defaultValue={data.secondaryPositionId} />
          <Select name="otherPositionId" label="Other position" options={reference.positions} placeholder="Choose…" defaultValue={data.otherPositionId} />
        </div>
        <div className="grid gap-md md:grid-cols-2">
          <TextField name="heightCm" label="Height (cm)" type="number" defaultValue={data.heightCm} errors={errors('heightCm')} />
          <TextField name="weightKg" label="Weight (kg)" type="number" defaultValue={data.weightKg} errors={errors('weightKg')} />
        </div>
        <OrganisationText idName="currentClubId" type="CLUB" textName="currentClubText" label="Current club" id={data.currentClubId} text={data.currentClubText} name={data.currentClubName} errors={errors('currentClubText')} />
        <OrganisationText idName="currentUnionId" type="UNION" textName="currentUnionText" label="Current union" id={data.currentUnionId} text={data.currentUnionText} name={data.currentUnionName} errors={errors('currentUnionText')} />
        <OrganisationText idName="currentInstitutionId" type="INSTITUTION" textName="currentInstitutionText" label="Current college or university" id={data.currentInstitutionId} text={data.currentInstitutionText} name={data.currentInstitutionName} errors={errors('currentInstitutionText')} />
        <TextField name="contractEndDate" label="Contract end date" type="date" defaultValue={data.contractEndDate} errors={errors('contractEndDate')} />
        <div className="grid gap-md md:grid-cols-2">
          <Select name="rugbyCode" label="League or union" options={rugbyCodes} placeholder="Choose…" defaultValue={data.rugbyCode} />
          <Select name="highestQualification" label="Highest qualification" options={reference.qualifications} placeholder="Choose…" defaultValue={data.highestQualification} />
        </div>
        <Select name="qualificationIds" label="Qualifications" options={reference.qualifications} multiple defaultValue={data.qualificationIds} />
        <div className="flex flex-col gap-xs">
          <Checkbox name="isKeenToRelocate" defaultSelected={data.isKeenToRelocate}>
            Keen to relocate
          </Checkbox>
          <Checkbox name="isRetired" defaultSelected={data.isRetired}>
            Retired
          </Checkbox>
          <Checkbox name="isOpenToBrandPartnership" defaultSelected={data.isOpenToBrandPartnership}>
            Open to brand partnerships
          </Checkbox>
        </div>
        <TextField name="strengths" label="Strengths" multiline defaultValue={data.strengths} errors={errors('strengths')} hint="Up to 500 characters." />
        <TextField name="workOns" label="Areas to work on" multiline defaultValue={data.workOns} errors={errors('workOns')} hint="Up to 500 characters." />
        <TextField name="colourPersonality" label="Colour personality" defaultValue={data.colourPersonality} errors={errors('colourPersonality')} />
        <Select name="softSkillIds" label="Soft skills" options={soft} multiple defaultValue={data.skillIds} />
        <Select name="gameSkillIds" label="Game skills" options={game} multiple defaultValue={data.skillIds} />
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}
