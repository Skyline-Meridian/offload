'use client'

import { useActionState } from 'react'

import { deleteChildEntry, savePathwayEntry, saveCoachEntry, saveSeasonEntry, saveSessionEntry } from '@/actions/organisation'
import { FormMessage } from '@/components/forms/form-message'
import { OrganisationPicker } from '@/components/forms/organisation-picker'
import { SubmitButton } from '@/components/forms/submit-button'
import { UploadField } from '@/components/forms/upload-field'
import type { OrganisationEditorData } from '@/components/organisations/editor/types'
import { SectionCard } from '@/components/players/editor/section-card'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'
import { idleFormState } from '@/lib/form-state'

type Kind = 'coach' | 'season' | 'trainingSession' | 'pathway'

function DeleteButton({ kind, id }: { kind: Kind; id: string }): React.JSX.Element {
  const [, formAction, pending] = useActionState(deleteChildEntry, idleFormState)
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm('Delete this entry?')) event.preventDefault()
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" size="sm" isDisabled={pending}>
        Delete
      </Button>
    </form>
  )
}

function Entries<T extends { id: string }>({ items, kind, title, children }: { items: T[]; kind: Kind; title: (item: T) => string; children: (item: T) => React.ReactNode }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-sm">
      {items.map((item) => (
        <li key={item.id} className="border-thin border-border p-sm">
          <details>
            <summary className="text-h5 cursor-pointer">{title(item)}</summary>
            <div className="mt-sm flex flex-col gap-sm">
              {children(item)}
              <DeleteButton kind={kind} id={item.id} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

function CoachForm({ entry }: { entry?: OrganisationEditorData['coaches'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveCoachEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <TextField name="name" label="Name" defaultValue={entry?.name} isRequired errors={errors('name')} />
      <TextField name="jobRole" label="Job role" defaultValue={entry?.jobRole} isRequired errors={errors('jobRole')} />
      <div className="grid gap-sm md:grid-cols-2">
        <TextField name="startDate" label="Joining date" type="date" defaultValue={entry?.startDate} isRequired errors={errors('startDate')} />
        <TextField name="endDate" label="Leaving date" type="date" defaultValue={entry?.endDate} errors={errors('endDate')} />
      </div>
      <UploadField name="photoFileId" label="Photo" purpose="COACH_IMAGE" defaultFileId={entry?.photoFileId} errors={errors('photoFileId')} />
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add coach'}
      </SubmitButton>
    </form>
  )
}

export function CoachesSection({ items }: { items: OrganisationEditorData['coaches'] }): React.JSX.Element {
  return (
    <SectionCard id="coaches" title="Coaches">
      <Entries items={items} kind="coach" title={(c) => `${c.name}, ${c.jobRole}`}>
        {(c) => <CoachForm entry={c} />}
      </Entries>
      <CoachForm />
    </SectionCard>
  )
}

function SeasonForm({ entry }: { entry?: OrganisationEditorData['seasons'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveSeasonEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <TextField name="label" label="Label" defaultValue={entry?.label} isRequired errors={errors('label')} hint="For example 2026/27" />
      <div className="grid gap-sm md:grid-cols-2">
        <TextField name="startDate" label="Start" type="date" defaultValue={entry?.startDate} isRequired errors={errors('startDate')} />
        <TextField name="endDate" label="End" type="date" defaultValue={entry?.endDate} isRequired errors={errors('endDate')} />
      </div>
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add season'}
      </SubmitButton>
    </form>
  )
}

export function SeasonsSection({ items }: { items: OrganisationEditorData['seasons'] }): React.JSX.Element {
  return (
    <SectionCard id="seasons" title="Seasons">
      <Entries items={items} kind="season" title={(s) => s.label}>
        {(s) => <SeasonForm entry={s} />}
      </Entries>
      <SeasonForm />
    </SectionCard>
  )
}

const days = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

function SessionForm({ entry }: { entry?: OrganisationEditorData['sessions'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveSessionEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <Select name="day" label="Day" options={days} required defaultValue={entry?.day} errors={errors('day')} />
      <div className="grid gap-sm md:grid-cols-2">
        <TextField name="startTime" label="Start (HH:mm)" type="time" defaultValue={entry?.startTime} isRequired errors={errors('startTime')} />
        <TextField name="endTime" label="End (HH:mm)" type="time" defaultValue={entry?.endTime} isRequired errors={errors('endTime')} />
      </div>
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add training day'}
      </SubmitButton>
    </form>
  )
}

export function TrainingSection({ items }: { items: OrganisationEditorData['sessions'] }): React.JSX.Element {
  return (
    <SectionCard id="training" title="Training days">
      <Entries items={items} kind="trainingSession" title={(s) => `${days.find((d) => d.value === s.day)?.label ?? s.day} ${s.startTime} to ${s.endTime}`}>
        {(s) => <SessionForm entry={s} />}
      </Entries>
      <SessionForm />
    </SectionCard>
  )
}

function PathwayForm({ entry }: { entry?: OrganisationEditorData['pathways'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(savePathwayEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <OrganisationPicker
        name="institutionId"
        label="College or university on Offload"
        type="INSTITUTION"
        defaultOption={entry?.institutionId ? { id: entry.institutionId, name: entry.institutionName, city: null } : undefined}
        errors={errors('institutionId')}
      />
      <TextField name="institutionText" label="Or type its name" defaultValue={entry?.institutionText} errors={errors('institutionText')} hint="Use this when it is not on Offload." />
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add pathway'}
      </SubmitButton>
    </form>
  )
}

export function PathwaysSection({ items }: { items: OrganisationEditorData['pathways'] }): React.JSX.Element {
  return (
    <SectionCard id="pathways" title="College and university pathways">
      <Entries items={items} kind="pathway" title={(p) => p.institutionName || p.institutionText}>
        {(p) => <PathwayForm entry={p} />}
      </Entries>
      <PathwayForm />
    </SectionCard>
  )
}
