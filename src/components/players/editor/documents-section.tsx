'use client'

import { saveCv, saveSocial, submitIdentityDocument } from '@/actions/player'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { UploadField } from '@/components/forms/upload-field'
import { SectionCard } from '@/components/players/editor/section-card'
import type { EditorData } from '@/components/players/editor/types'
import { Alert } from '@/components/ui/alert'
import { TextField } from '@/components/ui/input'
import { useSection } from '@/hooks/use-section'

const networks: { name: keyof EditorData['social']; label: string }[] = [
  { name: 'instagramUrl', label: 'Instagram' },
  { name: 'youtubeUrl', label: 'YouTube' },
  { name: 'linkedinUrl', label: 'LinkedIn' },
  { name: 'facebookUrl', label: 'Facebook' },
  { name: 'xUrl', label: 'X' },
]

export function SocialSection({ data }: { data: EditorData['social'] }): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveSocial)
  return (
    <SectionCard id="social" title="Social media">
      <form action={formAction} className="flex flex-col gap-md" noValidate>
        <FormMessage state={state} />
        {networks.map((n) => (
          <TextField key={n.name} name={n.name} label={n.label} defaultValue={data[n.name]} errors={errors(n.name)} hint="A handle or a link." />
        ))}
        <SubmitButton className="self-start">Save</SubmitButton>
      </form>
    </SectionCard>
  )
}

export function DocumentsSection({ cvFileId, documentStatus, isEmailVerified }: { cvFileId: string; documentStatus: string; isEmailVerified: boolean }): React.JSX.Element {
  const cv = useSection(saveCv)
  const identity = useSection(submitIdentityDocument)
  return (
    <SectionCard id="documents" title="Documents">
      <form action={cv.formAction} className="flex flex-col gap-sm">
        <FormMessage state={cv.state} />
        <UploadField name="cvFileId" label="CV" purpose="CV" defaultFileId={cvFileId} hint="PDF, up to 10 MB." errors={cv.errors('cvFileId')} />
        <SubmitButton className="self-start" size="sm">
          Save CV
        </SubmitButton>
      </form>
      <div className="flex flex-col gap-sm">
        <h3 className="text-h4">Identity document</h3>
        {documentStatus === 'VERIFIED' ? (
          <Alert variant="success">Your identity is verified.</Alert>
        ) : (
          <>
            {documentStatus === 'AWAITING_REVIEW' ? <Alert>Your document is waiting for review.</Alert> : null}
            {documentStatus === 'REJECTED' ? <Alert variant="error">Your last document was not accepted. Upload a new one.</Alert> : null}
            {!isEmailVerified ? <Alert variant="warning">Verify your email before sending a document.</Alert> : null}
            <form action={identity.formAction} className="flex flex-col gap-sm">
              <FormMessage state={identity.state} />
              <UploadField name="fileId" label="Passport, driving licence or ID card" purpose="IDENTITY_DOCUMENT" hint="PDF or image, up to 10 MB." errors={identity.errors('fileId')} />
              <SubmitButton className="self-start" size="sm">
                Send for review
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </SectionCard>
  )
}
