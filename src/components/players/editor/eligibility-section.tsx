'use client'

import { saveAcademic, saveConditioning, saveEligibility } from '@/actions/player'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { SectionCard } from '@/components/players/editor/section-card'
import type { EditorData, EditorReference } from '@/components/players/editor/types'
import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'

const ageGroups = [
  { value: 'U16', label: 'Under 16' },
  { value: 'U18', label: 'Under 18' },
  { value: 'U20', label: 'Under 20' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'SEVENS', label: 'Sevens' },
]

export function EligibilitySection({ data, reference }: { data: EditorData['eligibility']; reference: EditorReference }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveEligibility)
  return (
    <SectionCard id="eligibility" title="Eligibility and caps">
      <form action={formAction} className="flex flex-col gap-md" noValidate>
        <FormMessage state={state} />
        <Select name="eligibleCountries" label="Eligible to play for" options={reference.countries} multiple defaultValue={data.eligibleCountries} />
        <Checkbox name="isCapped" defaultSelected={data.isCapped}>
          I have been capped
        </Checkbox>
        <p className="text-hint">The details below are saved only when you are capped.</p>
        <Select name="cappedCountries" label="Capped for" options={reference.countries} multiple defaultValue={data.cappedCountries} />
        <Select name="ageGroups" label="Age groups" options={ageGroups} multiple defaultValue={data.ageGroups} />
        <div className="grid gap-md md:grid-cols-3">
          <TextField name="firstCap" label="First cap" type="date" defaultValue={data.firstCap} errors={errors('firstCap')} />
          <TextField name="lastCap" label="Last cap" type="date" defaultValue={data.lastCap} errors={errors('lastCap')} />
          <TextField name="totalCaps" label="Total caps" type="number" defaultValue={data.totalCaps} errors={errors('totalCaps')} />
        </div>
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}

const tests: { name: keyof EditorData['conditioning']; label: string }[] = [
  { name: 'maxSpeedMs', label: 'Max speed (m/s)' },
  { name: 'broadJumpCm', label: 'Broad jump (cm)' },
  { name: 'test1200Sec', label: '1200 m time (s)' },
  { name: 'cmjCm', label: 'CMJ (cm)' },
  { name: 'bench1rmKg', label: 'Bench press 1RM (kg)' },
  { name: 'squat1rmKg', label: 'Squat 1RM (kg)' },
]

export function ConditioningSection({ data }: { data: EditorData['conditioning'] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveConditioning)
  return (
    <SectionCard id="conditioning" title="Strength and conditioning">
      <form action={formAction} className="flex flex-col gap-md" noValidate>
        <FormMessage state={state} />
        <div className="grid gap-md md:grid-cols-3">
          {tests.map((t) => (
            <TextField key={t.name} name={t.name} label={t.label} type="number" defaultValue={data[t.name]} errors={errors(t.name)} />
          ))}
        </div>
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}

export function AcademicSection({ data }: { data: EditorData['academic'] }): React.JSX.Element {
  const { state, formAction } = useSection(saveAcademic)
  return (
    <SectionCard id="academic" title="Academic">
      <form action={formAction} className="flex flex-col gap-md">
        <FormMessage state={state} />
        <Checkbox name="hasAcademicInterest" defaultSelected={data.hasAcademicInterest}>
          I am interested in studying alongside playing
        </Checkbox>
        <Checkbox name="isGraduated" defaultSelected={data.isGraduated}>
          I have graduated
        </Checkbox>
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}
