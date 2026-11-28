'use client'

import { useActionState } from 'react'

import {
  deleteListEntry,
  saveAchievementEntry,
  saveClubHistoryEntry,
  saveFeaturedVideoEntry,
  saveHighlightVideo,
} from '@/actions/player'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { SectionCard } from '@/components/players/editor/section-card'
import type { EditorData } from '@/components/players/editor/types'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import { useSection } from '@/hooks/use-section'
import { idleFormState } from '@/lib/form-state'

function DeleteButton({ kind, id }: { kind: 'clubHistory' | 'achievement' | 'featuredVideo'; id: string }): React.JSX.Element {
  const [, formAction, pending] = useActionState(deleteListEntry, idleFormState)
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

function ClubHistoryForm({ entry }: { entry?: EditorData['clubHistory'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveClubHistoryEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <TextField name="clubName" label="Club name" defaultValue={entry?.clubName} isRequired errors={errors('clubName')} />
      <div className="grid gap-sm md:grid-cols-2">
        <TextField name="startDate" label="Start date" type="date" defaultValue={entry?.startDate} errors={errors('startDate')} />
        <TextField name="endDate" label="End date" type="date" defaultValue={entry?.endDate} errors={errors('endDate')} hint="Leave empty if you are still there." />
      </div>
      <TextField name="coaches" label="Coaches" defaultValue={entry?.coaches} errors={errors('coaches')} />
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add club'}
      </SubmitButton>
    </form>
  )
}

export function ClubHistorySection({ entries }: { entries: EditorData['clubHistory'] }): React.JSX.Element {
  return (
    <SectionCard id="club-history" title="Club history">
      <ul className="flex flex-col gap-sm">
        {entries.map((e) => (
          <li key={e.id} className="border-thin border-border p-sm">
            <details>
              <summary className="text-h5 cursor-pointer">{e.clubName}</summary>
              <div className="mt-sm flex flex-col gap-sm">
                <ClubHistoryForm entry={e} />
                <DeleteButton kind="clubHistory" id={e.id} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <ClubHistoryForm />
    </SectionCard>
  )
}

function AchievementForm({ entry }: { entry?: EditorData['achievements'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveAchievementEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <TextField name="title" label="Title" defaultValue={entry?.title} isRequired errors={errors('title')} />
      <TextField name="year" label="Year" type="number" defaultValue={entry?.year} errors={errors('year')} />
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add achievement'}
      </SubmitButton>
    </form>
  )
}

export function AchievementsSection({ entries }: { entries: EditorData['achievements'] }): React.JSX.Element {
  return (
    <SectionCard id="achievements" title="Achievements">
      <ul className="flex flex-col gap-sm">
        {entries.map((e) => (
          <li key={e.id} className="border-thin border-border p-sm">
            <details>
              <summary className="text-h5 cursor-pointer">{e.title}</summary>
              <div className="mt-sm flex flex-col gap-sm">
                <AchievementForm entry={e} />
                <DeleteButton kind="achievement" id={e.id} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <AchievementForm />
    </SectionCard>
  )
}

function FeaturedVideoForm({ entry }: { entry?: EditorData['featuredVideos'][number] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveFeaturedVideoEntry)
  return (
    <form action={formAction} className="flex flex-col gap-sm" noValidate>
      <FormMessage state={state} />
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <TextField name="youtubeUrl" label="YouTube or Vimeo link" defaultValue={entry?.youtubeUrl} isRequired errors={errors('youtubeUrl')} />
      <TextField name="howToIdentify" label="How to identify me" defaultValue={entry?.howToIdentify} errors={errors('howToIdentify')} hint="Up to 150 characters." />
      <SubmitButton className="self-start" size="sm">
        {entry ? 'Save changes' : 'Add video'}
      </SubmitButton>
    </form>
  )
}

export function VideosSection({ highlightVideoUrl, featured }: { highlightVideoUrl: string; featured: EditorData['featuredVideos'] }): React.JSX.Element {
  const highlight = useSection(saveHighlightVideo)
  return (
    <SectionCard id="videos" title="Videos">
      <form action={highlight.formAction} className="flex flex-col gap-sm" noValidate>
        <FormMessage state={highlight.state} />
        <TextField name="highlightVideoUrl" label="Highlight video" defaultValue={highlightVideoUrl} errors={highlight.errors('highlightVideoUrl')} hint="A YouTube or Vimeo link." />
        <SubmitButton className="self-start" size="sm">
          Save
        </SubmitButton>
      </form>
      <h3 className="text-h4">Featured videos</h3>
      <ul className="flex flex-col gap-sm">
        {featured.map((v) => (
          <li key={v.id} className="border-thin border-border p-sm">
            <details>
              <summary className="text-h5 cursor-pointer">{v.youtubeUrl}</summary>
              <div className="mt-sm flex flex-col gap-sm">
                <FeaturedVideoForm entry={v} />
                <DeleteButton kind="featuredVideo" id={v.id} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <FeaturedVideoForm />
    </SectionCard>
  )
}
