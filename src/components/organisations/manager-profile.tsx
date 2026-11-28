'use client'

import { saveManagerIdentity, submitManagerDocumentAction } from '@/actions/organisation'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { UploadField } from '@/components/forms/upload-field'
import { IdentitySection } from '@/components/players/editor/identity-section'
import { SectionCard } from '@/components/players/editor/section-card'
import type { EditorData, EditorReference } from '@/components/players/editor/types'
import { Alert } from '@/components/ui/alert'
import { useSection } from '@/hooks/use-section'

type Props = {
  identity: EditorData['identity']
  reference: EditorReference
  documentStatus: string
  isEmailVerified: boolean
}

export function ManagerProfile({ identity, reference, documentStatus, isEmailVerified }: Props): React.JSX.Element {
  const doc = useSection(submitManagerDocumentAction)
  return (
    <div className="flex flex-col gap-lg">
      <IdentitySection data={identity} reference={reference} action={saveManagerIdentity} />
      <SectionCard id="documents" title="Identity document">
        {documentStatus === 'VERIFIED' ? (
          <Alert variant="success">Your identity is verified.</Alert>
        ) : (
          <>
            {documentStatus === 'AWAITING_REVIEW' ? <Alert>Your document is waiting for review.</Alert> : null}
            {documentStatus === 'REJECTED' ? <Alert variant="error">Your last document was not accepted. Upload a new one.</Alert> : null}
            {!isEmailVerified ? <Alert variant="warning">Verify your email before sending a document.</Alert> : null}
            <form action={doc.formAction} className="flex flex-col gap-sm">
              <FormMessage state={doc.state} />
              <UploadField name="fileId" label="Passport, driving licence or ID card" purpose="IDENTITY_DOCUMENT" hint="PDF or image, up to 10 MB." errors={doc.errors('fileId')} />
              <SubmitButton className="self-start" size="sm">
                Send for review
              </SubmitButton>
            </form>
          </>
        )}
      </SectionCard>
    </div>
  )
}
