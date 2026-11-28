'use client'

import { saveIdentity } from '@/actions/player'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { UploadField } from '@/components/forms/upload-field'
import { SectionCard } from '@/components/players/editor/section-card'
import type { EditorData, EditorReference } from '@/components/players/editor/types'
import { TextField } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'
import type { FormState } from '@/lib/form-state'

type Props = {
  data: EditorData['identity']
  reference: EditorReference
  /** Managers use their own action; players use the default. */
  action?: (prev: FormState, formData: FormData) => Promise<FormState>
}

export function IdentitySection({ data, reference, action = saveIdentity }: Props): React.JSX.Element {
  const { state, formAction, errors } = useSection(action)
  return (
    <SectionCard id="identity" title="About you">
      <form action={formAction} className="flex flex-col gap-md" noValidate>
        <FormMessage state={state} />
        <div className="grid gap-md md:grid-cols-2">
          <TextField name="firstName" label="First name" defaultValue={data.firstName} isRequired errors={errors('firstName')} />
          <TextField name="lastName" label="Last name" defaultValue={data.lastName} isRequired errors={errors('lastName')} />
        </div>
        <TextField name="dateOfBirth" label="Date of birth" type="date" defaultValue={data.dateOfBirth} isRequired errors={errors('dateOfBirth')} />
        <Select
          name="nationalities"
          label="Nationality"
          options={reference.countries}
          multiple
          required
          defaultValue={data.nationalities}
          hint="Hold Ctrl (Cmd on a Mac) to choose more than one."
          errors={errors('nationalities')}
        />
        <TextField name="personalPhone" label="Phone number" type="tel" defaultValue={data.personalPhone} errors={errors('personalPhone')} hint="Only Offload staff can see this." />
        <TextField name="bio" label="Biography" multiline rows={6} defaultValue={data.bio} errors={errors('bio')} />
        <UploadField name="profilePictureId" label="Profile picture" purpose="PROFILE_PICTURE" defaultFileId={data.profilePictureId} hint="JPEG, PNG, WebP, HEIC or AVIF, up to 2 MB." errors={errors('profilePictureId')} />
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}
