import 'server-only'

import { UPLOAD_PURPOSES, UPLOAD_URL_SECONDS, type UploadPurposeKey } from '@/lib/constants'
import { DomainError } from '@/lib/errors'
import { messages } from '@/lib/messages'
import { db } from '@/server/db'
import { enqueue } from '@/server/outbox'
import { hit } from '@/server/rate-limit'
import { storage, type UploadTarget } from '@/server/storage'

export type CreatedUpload = { fileId: string; target: UploadTarget }

/** Step 1: creates the file record and a signed address the browser uploads to. */
export async function createUpload(
  userId: string,
  input: { purpose: UploadPurposeKey; contentType: string; size: number },
): Promise<CreatedUpload> {
  const rules = UPLOAD_PURPOSES[input.purpose]
  const allowed: readonly string[] = rules.types
  if (!allowed.includes(input.contentType)) throw new DomainError('type-not-allowed', 'This file type is not allowed.')
  if (input.size <= 0 || input.size > rules.maxBytes) {
    throw new DomainError('too-large', `The file is too large. The limit is ${Math.round(rules.maxBytes / (1024 * 1024))} MB.`)
  }
  if (!(await hit('uploadsUser', userId)).allowed) throw new DomainError('rate-limited', messages.tooManyRequests)

  const file = await db.file.create({
    data: {
      purpose: input.purpose,
      status: 'PENDING',
      bucket: 'uploads',
      key: 'pending',
      mimeType: input.contentType,
      sizeBytes: input.size,
      ownerId: userId,
    },
  })
  const key = `uploads/${file.id}`
  await db.file.update({ where: { id: file.id }, data: { key } })
  const target = await storage.createUploadTarget(key, input.contentType, rules.maxBytes, UPLOAD_URL_SECONDS)
  return { fileId: file.id, target }
}

/** Step 3: the browser says the upload finished; the worker checks and converts the file. */
export async function completeUpload(userId: string, fileId: string): Promise<void> {
  const file = await db.file.findUnique({ where: { id: fileId } })
  if (!file || file.ownerId !== userId) throw new DomainError('not-found', 'File not found.')
  if (file.status !== 'PENDING') return
  await db.$transaction((tx) => enqueue(tx, 'image.process', { fileId }))
}

export type UploadStatus = { status: 'PENDING' | 'READY' | 'REJECTED'; reason: string | null }

/** Step 5: the browser asks whether the worker has finished. */
export async function uploadStatus(userId: string, fileId: string): Promise<UploadStatus | null> {
  const file = await db.file.findUnique({ where: { id: fileId }, select: { ownerId: true, status: true, rejectReason: true } })
  if (!file || file.ownerId !== userId) return null
  return { status: file.status, reason: file.rejectReason }
}
