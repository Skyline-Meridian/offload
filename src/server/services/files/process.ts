import 'server-only'

import decodeHeic from 'heic-decode'
import sharp, { type Sharp } from 'sharp'

import { UPLOAD_PURPOSES, VARIANT_WIDTHS, type ImageVariant, type UploadPurposeKey } from '@/lib/constants'
import { detectFileType, type DetectedType } from '@/lib/file-type'
import { db } from '@/server/db'
import { log } from '@/server/log'
import { storage } from '@/server/storage'

async function reject(fileId: string, reason: string): Promise<void> {
  await db.file.update({ where: { id: fileId }, data: { status: 'REJECTED', rejectReason: reason } })
  log.info('file rejected', { fileId, reason })
}

/** Turns any accepted image into a sharp input (HEIC is decoded first), with the orientation applied. */
async function imageInput(data: Buffer, type: DetectedType): Promise<Sharp> {
  if (type === 'image/heic') {
    const decoded = await decodeHeic({ buffer: data })
    return sharp(Buffer.from(decoded.data), { raw: { width: decoded.width, height: decoded.height, channels: 4 } })
  }
  return sharp(data, { failOn: 'error' }).rotate()
}

/**
 * The worker's file step (01 section 12.2): check the real type, convert, write to the content bucket,
 * remove the raw upload and mark the file ready.
 */
export async function processFile(fileId: string): Promise<void> {
  const file = await db.file.findUnique({ where: { id: fileId } })
  if (!file || file.status !== 'PENDING') return
  if (!(file.purpose in UPLOAD_PURPOSES)) return
  const rules = UPLOAD_PURPOSES[file.purpose as UploadPurposeKey]

  let data: Buffer
  try {
    data = await storage.read('uploads', file.key)
  } catch {
    await reject(fileId, 'The upload was not found.')
    return
  }
  if (data.length > rules.maxBytes) {
    await reject(fileId, 'The file is too large.')
    return
  }
  const type = detectFileType(data)
  const allowed: readonly string[] = rules.types
  const isAllowed = type !== null && (allowed.includes(type) || (type === 'image/heic' && allowed.includes('image/heif')))
  if (!type || !isAllowed) {
    await storage.remove('uploads', file.key)
    await reject(fileId, 'This file type is not allowed.')
    return
  }

  let bucketKey: string
  let variants: ImageVariant[] = []
  try {
    if (type === 'application/pdf') {
      bucketKey = `private/${fileId}.pdf`
      await storage.write('content', bucketKey, data, 'application/pdf')
    } else if (rules.area === 'public') {
      bucketKey = `public/${fileId}`
      variants = [...rules.variants]
      for (const variant of variants) {
        const image = await imageInput(data, type)
        const out = await image
          .resize({ width: VARIANT_WIDTHS[variant], withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()
        await storage.write('content', `${bucketKey}/${variant}.webp`, out, 'image/webp')
      }
    } else {
      bucketKey = `private/${fileId}.webp`
      const image = await imageInput(data, type)
      const out = await image.webp({ quality: 90 }).toBuffer()
      await storage.write('content', bucketKey, out, 'image/webp')
    }
  } catch {
    await storage.remove('uploads', file.key)
    await reject(fileId, 'The file could not be read.')
    return
  }

  await storage.remove('uploads', file.key)
  await db.file.update({
    where: { id: fileId },
    data: {
      status: 'READY',
      bucket: 'content',
      key: bucketKey,
      variants,
      mimeType: type === 'application/pdf' ? 'application/pdf' : 'image/webp',
      rejectReason: null,
    },
  })
}
