'use client'

import { Upload } from 'lucide-react'
import { useState } from 'react'
import { FileTrigger } from 'react-aria-components'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Spinner } from '@/components/ui/spinner'
import { useUpload } from '@/hooks/use-upload'
import { UPLOAD_PURPOSES, type UploadPurposeKey } from '@/lib/constants'

type Props = {
  /** Form field that receives the id of the finished file. */
  name: string
  label: string
  purpose: UploadPurposeKey
  hint?: string
  defaultFileId?: string
  errors?: readonly string[]
}

/** Uploads a file straight to storage, waits until it is processed, and puts its id in a hidden field. */
export function UploadField({ name, label, purpose, hint, defaultFileId, errors }: Props): React.JSX.Element {
  const { state, upload } = useUpload(purpose)
  const [fileName, setFileName] = useState<string | null>(null)
  const accept = [...UPLOAD_PURPOSES[purpose].types]
  const fileId = state.status === 'ready' ? state.fileId : (defaultFileId ?? '')
  const busy = state.status === 'uploading' || state.status === 'processing'

  return (
    <div className="flex flex-col gap-2xs">
      <span className="text-label" id={`${name}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={fileId} />
      <div className="flex items-center gap-sm">
        <FileTrigger
          acceptedFileTypes={accept}
          onSelect={(files) => {
            const file = files?.[0]
            if (!file) return
            setFileName(file.name)
            void upload(file)
          }}
        >
          <Button variant="ghost" size="sm" isDisabled={busy} aria-describedby={`${name}-label`}>
            <Icon icon={Upload} size="sm" />
            Choose file
          </Button>
        </FileTrigger>
        {busy ? <Spinner label={state.status === 'uploading' ? 'Uploading' : 'Processing'} /> : null}
        {state.status === 'ready' && fileName ? <span className="text-body">{fileName} uploaded</span> : null}
      </div>
      {hint ? <p className="text-hint">{hint}</p> : null}
      {state.status === 'error' ? <Alert variant="error">{state.message}</Alert> : null}
      {errors?.length ? <p className="text-body text-error">{errors.join(' ')}</p> : null}
    </div>
  )
}
