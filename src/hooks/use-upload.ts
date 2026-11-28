'use client'

import { useCallback, useState } from 'react'

import type { UploadPurposeKey } from '@/lib/constants'

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'processing' }
  | { status: 'ready'; fileId: string }
  | { status: 'error'; message: string }

const POLL_MS = 1000
const POLL_LIMIT = 30

type Created = { fileId: string; target: { url: string; method: 'PUT'; headers: Record<string, string> } }

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? 'The upload failed. Please try again.')
  return body
}

/** Runs the upload steps from 01 section 12.2 and reports progress. */
export function useUpload(purpose: UploadPurposeKey): {
  state: UploadState
  upload: (file: File) => Promise<string | null>
  reset: () => void
} {
  const [state, setState] = useState<UploadState>({ status: 'idle' })

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        setState({ status: 'uploading' })
        const created = await json<Created>(
          await fetch('/api/uploads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purpose, contentType: file.type, size: file.size }),
          }),
        )
        const put = await fetch(created.target.url, { method: 'PUT', headers: created.target.headers, body: file })
        if (!put.ok) throw new Error('The upload failed. Please try again.')

        setState({ status: 'processing' })
        await json(
          await fetch('/api/uploads', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: created.fileId }),
          }),
        )
        for (let i = 0; i < POLL_LIMIT; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_MS))
          const status = await json<{ status: 'PENDING' | 'READY' | 'REJECTED'; reason: string | null }>(
            await fetch(`/api/uploads?fileId=${created.fileId}`, { cache: 'no-store' }),
          )
          if (status.status === 'READY') {
            setState({ status: 'ready', fileId: created.fileId })
            return created.fileId
          }
          if (status.status === 'REJECTED') throw new Error(status.reason ?? 'This file was not accepted.')
        }
        throw new Error('The file is taking longer than expected. Please try again.')
      } catch (error) {
        setState({ status: 'error', message: error instanceof Error ? error.message : 'The upload failed.' })
        return null
      }
    },
    [purpose],
  )

  return { state, upload, reset: () => setState({ status: 'idle' }) }
}
