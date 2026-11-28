'use client'

import { savePlaying } from '@/actions/player'
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

/** An organisation is either linked (shown by name, kept as it is) or typed as text. */
function OrganisationText({ idName, textName, label, id, text, name, errors }: LinkedProps): React.JSX.Element {
  return (
    <>
      <input type="hidden" name={idName} value={id} />
      {id ? (
        <TextField name={`${textName}Shown`} label={label} defaultValue={name} isReadOnly hint="Linked to an organisation on Offload." />
      ) : (
        <TextField name={textName} label={label} defaultValue={text} errors={errors} />
      )}
    </>
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
        <OrganisationText idName="currentClubId" textName="currentClubText" label="Current club" id={data.currentClubId} text={data.currentClubText} name={data.currentClubName} errors={errors('currentClubText')} />
        <OrganisationText idName="currentUnionId" textName="currentUnionText" label="Current union" id={data.currentUnionId} text={data.currentUnionText} name={data.currentUnionName} errors={errors('currentUnionText')} />
        <OrganisationText idName="currentInstitutionId" textName="currentInstitutionText" label="Current college or university" id={data.currentInstitutionId} text={data.currentInstitutionText} name={data.currentInstitutionName} errors={errors('currentInstitutionText')} />
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
