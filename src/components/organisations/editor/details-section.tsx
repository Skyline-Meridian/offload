'use client'

import { saveOrganisation } from '@/actions/organisation'
import { FormMessage } from '@/components/forms/form-message'
import { FullAddressField, SingleAddressField } from '@/components/forms/address-field'
import { RichTextEditor } from '@/components/forms/rich-text-editor'
import { SubmitButton } from '@/components/forms/submit-button'
import { UploadField } from '@/components/forms/upload-field'
import type { OrganisationEditorData, OrganisationEditorReference } from '@/components/organisations/editor/types'
import { SectionCard } from '@/components/players/editor/section-card'
import { TextField } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'
import { fieldLabel } from '@/lib/validation/organisation'
import { useState } from 'react'

const socials: { name: keyof OrganisationEditorData['social']; label: string }[] = [
  { name: 'facebookUrl', label: 'Facebook' },
  { name: 'instagramUrl', label: 'Instagram' },
  { name: 'linkedinUrl', label: 'LinkedIn' },
  { name: 'xUrl', label: 'X' },
  { name: 'youtubeUrl', label: 'YouTube' },
]

export function DetailsSection({ data, reference }: { data: OrganisationEditorData; reference: OrganisationEditorReference }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveOrganisation)
  const [industry, setIndustry] = useState(data.industryId)
  const type = data.type
  const sports = type !== 'BRAND'
  const leagues = type === 'CLUB' || type === 'UNION'

  return (
    <SectionCard id="details" title="Organisation details">
      <form action={formAction} className="flex flex-col gap-md" noValidate>
        <FormMessage state={state} />
        <TextField name="name" label={fieldLabel(type, 'name')} defaultValue={data.name} isRequired errors={errors('name')} />
        <UploadField name="logoFileId" label="Logo" purpose="ORGANISATION_LOGO" defaultFileId={data.logoFileId} hint="JPEG, PNG, WebP, HEIC or AVIF, up to 2 MB." errors={errors('logoFileId')} />
        <div className="grid gap-md md:grid-cols-2">
          <TextField name="officialEmail" label="Official email" type="email" defaultValue={data.officialEmail} errors={errors('officialEmail')} />
          <TextField name="officialPhone" label="Official phone" type="tel" defaultValue={data.officialPhone} errors={errors('officialPhone')} />
        </div>
        <div className="grid gap-md md:grid-cols-2">
          <TextField name="website" label="Website" defaultValue={data.website} isRequired={type === 'BRAND'} errors={errors('website')} />
          <TextField name="foundedYear" label={fieldLabel(type, 'founded')} type="number" defaultValue={data.foundedYear} errors={errors('foundedYear')} />
        </div>
        <RichTextEditor name="description" label="Description" defaultValue={data.description} errors={errors('description')} hint="Up to 5,000 characters." />
        <FullAddressField value={data.address} countries={reference.countries} label={fieldLabel(type, 'address')} errors={errors} />

        {sports ? (
          <>
            <TextField name="registrationNumber" label={fieldLabel(type, 'registrationNumber')} defaultValue={data.registrationNumber} isRequired errors={errors('registrationNumber')} />
            <SingleAddressField name="trainingGround" label="Training ground" defaultValue={data.trainingGround} defaultPlaceId={data.trainingGroundPlaceId} errors={errors} />
            <SingleAddressField name="playingGround" label="Playing ground" defaultValue={data.playingGround} defaultPlaceId={data.playingGroundPlaceId} errors={errors} />
            <TextField name="previousResults" label="Previous results" multiline defaultValue={data.previousResults} errors={errors('previousResults')} hint="Up to 2,000 characters." />
          </>
        ) : null}
        {leagues ? (
          <>
            <Select name="leagueIds" label="Leagues" options={reference.leagues} multiple defaultValue={data.leagueIds} hint="Hold Ctrl (Cmd on a Mac) to choose more than one." />
            <TextField name="level" label="Level" defaultValue={data.level} errors={errors('level')} />
          </>
        ) : null}
        {type === 'INSTITUTION' ? (
          <Select
            name="institutionKind"
            label="Type"
            required
            defaultValue={data.institutionKind}
            options={[
              { value: 'COLLEGE', label: 'College' },
              { value: 'UNIVERSITY', label: 'University' },
            ]}
            errors={errors('institutionKind')}
          />
        ) : null}
        {type === 'BRAND' ? (
          <>
            <Select name="industryId" label="Industry" options={reference.industries} placeholder="Choose…" required defaultValue={data.industryId} onValueChange={setIndustry} errors={errors('industryId')} />
            {industry === 'other' ? <TextField name="industryOther" label="Tell us your industry" defaultValue={data.industryOther} isRequired errors={errors('industryOther')} /> : null}
          </>
        ) : null}

        {socials.map((n) => (
          <TextField key={n.name} name={n.name} label={n.label} defaultValue={data.social[n.name]} errors={errors(n.name)} hint="A handle or a link." />
        ))}
        <UploadField name="documentFileId" label="Verification document" purpose="ORGANISATION_DOCUMENT" defaultFileId={data.documentFileId} hint="PDF or image, up to 10 MB. Only Offload staff can see it." errors={errors('documentFileId')} />
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}
