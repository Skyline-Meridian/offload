import { z } from 'zod'

import { UPLOAD_PURPOSES, type UploadPurposeKey } from '@/lib/constants'
import { DomainError } from '@/lib/errors'
import { messages } from '@/lib/messages'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { canUpload } from '@/server/policies/uploads'
import { runAsUser } from '@/server/context'
import { completeUpload, createUpload, uploadStatus } from '@/server/services/files/uploads'

const purposes = Object.keys(UPLOAD_PURPOSES) as [UploadPurposeKey, ...UploadPurposeKey[]]
const createSchema = z.object({ purpose: z.enum(purposes), contentType: z.string().min(1), size: z.number().int().positive() })
const completeSchema = z.object({ fileId: z.uuid() })

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

/** Step 1: ask for a place to upload to. */
export async function POST(request: Request): Promise<Response> {
  const viewer = await getViewer()
  if (!viewer) return error(messages.loginRequired, 401)
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return error('Invalid request.', 400)
  if (!canUpload(viewer, parsed.data.purpose)) return error(messages.notAllowed, 403)
  try {
    const created = await runAsUser(viewer.user.id, viewer.role, () => createUpload(viewer.user.id, parsed.data))
    return Response.json(created)
  } catch (e) {
    if (e instanceof DomainError) return error(e.message, e.code === 'rate-limited' ? 429 : 400)
    log.error('upload create failed', errorInfo(e))
    return error(messages.genericError, 500)
  }
}

/** Step 3: the file has been uploaded. */
export async function PUT(request: Request): Promise<Response> {
  const viewer = await getViewer()
  if (!viewer) return error(messages.loginRequired, 401)
  const parsed = completeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return error('Invalid request.', 400)
  try {
    await runAsUser(viewer.user.id, viewer.role, () => completeUpload(viewer.user.id, parsed.data.fileId))
    return Response.json({ ok: true })
  } catch (e) {
    if (e instanceof DomainError) return error(e.message, 404)
    log.error('upload complete failed', errorInfo(e))
    return error(messages.genericError, 500)
  }
}

/** Step 5: has the worker finished? */
export async function GET(request: Request): Promise<Response> {
  const viewer = await getViewer()
  if (!viewer) return error(messages.loginRequired, 401)
  const fileId = new URL(request.url).searchParams.get('fileId')
  if (!fileId || !z.uuid().safeParse(fileId).success) return error('Invalid request.', 400)
  const status = await uploadStatus(viewer.user.id, fileId)
  if (!status) return error('File not found.', 404)
  return Response.json(status, { headers: { 'Cache-Control': 'no-store' } })
}
