import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

import { Storage } from '@google-cloud/storage'

import { env } from '@/server/env'

/** `uploads`: raw files straight from the browser (short lived). `content`: processed files that are served. */
export type Bucket = 'uploads' | 'content'

export type UploadTarget = {
  url: string
  method: 'PUT'
  headers: Record<string, string>
}

export interface StorageDriver {
  createUploadTarget(key: string, contentType: string, maxBytes: number, seconds: number): Promise<UploadTarget>
  read(bucket: Bucket, key: string): Promise<Buffer>
  write(bucket: Bucket, key: string, data: Buffer, contentType: string): Promise<void>
  remove(bucket: Bucket, key: string): Promise<void>
  signedReadUrl(bucket: Bucket, key: string, seconds: number): Promise<string>
}

// ─── Local disk (development and tests) ─────────────────────────────────

function localRoot(): string {
  return resolve(/*turbopackIgnore: true*/ process.cwd(), /*turbopackIgnore: true*/ env.LOCAL_STORAGE_DIR)
}

function localPath(bucket: Bucket, key: string): string {
  const root = join(/*turbopackIgnore: true*/ localRoot(), /*turbopackIgnore: true*/ bucket)
  const full = resolve(/*turbopackIgnore: true*/ root, /*turbopackIgnore: true*/ key)
  if (!full.startsWith(root + sep)) throw new Error('Invalid storage key')
  return full
}

function localSignature(bucket: Bucket, key: string, expires: number, action: 'read' | 'write'): string {
  return createHmac('sha256', env.BETTER_AUTH_SECRET).update(`${action}:${bucket}:${key}:${expires}`).digest('hex')
}

/** Used by the local storage route to check a link made by this driver. */
export function verifyLocalSignature(
  bucket: Bucket,
  key: string,
  expires: number,
  action: 'read' | 'write',
  signature: string,
): boolean {
  if (!Number.isFinite(expires) || expires < Date.now() / 1000) return false
  const expected = Buffer.from(localSignature(bucket, key, expires, action))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

function localUrl(bucket: Bucket, key: string, action: 'read' | 'write', seconds: number): string {
  const expires = Math.floor(Date.now() / 1000) + seconds
  const sig = localSignature(bucket, key, expires, action)
  const path = key.split('/').map(encodeURIComponent).join('/')
  return `/api/dev-storage/${bucket}/${path}?expires=${expires}&action=${action}&sig=${sig}`
}

const localDriver: StorageDriver = {
  async createUploadTarget(key, contentType, _maxBytes, seconds) {
    return { url: localUrl('uploads', key, 'write', seconds), method: 'PUT', headers: { 'Content-Type': contentType } }
  },
  async read(bucket, key) {
    return readFile(localPath(bucket, key))
  },
  async write(bucket, key, data) {
    const path = localPath(bucket, key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, data)
  },
  async remove(bucket, key) {
    await rm(localPath(bucket, key), { force: true })
  },
  async signedReadUrl(bucket, key, seconds) {
    return localUrl(bucket, key, 'read', seconds)
  },
}

/** Writes an uploaded body for the local driver. Used only by the dev storage route. */
export async function writeLocalUpload(key: string, data: Buffer): Promise<void> {
  await localDriver.write('uploads', key, data, 'application/octet-stream')
}

export async function readLocalObject(bucket: Bucket, key: string): Promise<Buffer> {
  return localDriver.read(bucket, key)
}

// ─── Google Cloud Storage ───────────────────────────────────────────────

let gcs: Storage | undefined

function bucketName(bucket: Bucket): string {
  const name = bucket === 'uploads' ? env.GCS_UPLOADS_BUCKET : env.GCS_USER_CONTENT_BUCKET
  if (!name) throw new Error('Cloud Storage bucket names are not set')
  return name
}

function file(bucket: Bucket, key: string) {
  gcs ??= new Storage({ projectId: env.GCP_PROJECT_ID })
  return gcs.bucket(bucketName(bucket)).file(key)
}

const gcsDriver: StorageDriver = {
  async createUploadTarget(key, contentType, maxBytes, seconds) {
    const range = `0,${maxBytes}`
    const [url] = await file('uploads', key).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + seconds * 1000,
      contentType,
      extensionHeaders: { 'x-goog-content-length-range': range },
    })
    return { url, method: 'PUT', headers: { 'Content-Type': contentType, 'x-goog-content-length-range': range } }
  },
  async read(bucket, key) {
    const [data] = await file(bucket, key).download()
    return data
  },
  async write(bucket, key, data, contentType) {
    await file(bucket, key).save(data, { contentType, resumable: false })
  },
  async remove(bucket, key) {
    await file(bucket, key).delete({ ignoreNotFound: true })
  },
  async signedReadUrl(bucket, key, seconds) {
    const [url] = await file(bucket, key).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + seconds * 1000,
    })
    return url
  },
}

export const storage: StorageDriver = env.STORAGE_DRIVER === 'gcs' ? gcsDriver : localDriver
