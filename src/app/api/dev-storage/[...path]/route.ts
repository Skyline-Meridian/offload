import { connection } from 'next/server'

import { env } from '@/server/env'
import { readLocalObject, verifyLocalSignature, writeLocalUpload, type Bucket } from '@/server/storage'

// Serves the local storage driver. It does not exist when the Cloud Storage driver is used.
async function check(request: Request, ctx: { params: Promise<{ path: string[] }> }, action: 'read' | 'write') {
  await connection()
  if (env.STORAGE_DRIVER !== 'local') return null
  const { path } = await ctx.params
  const [bucket, ...rest] = path
  if (bucket !== 'uploads' && bucket !== 'content') return null
  const key = rest.map(decodeURIComponent).join('/')
  const url = new URL(request.url)
  const ok = verifyLocalSignature(
    bucket,
    key,
    Number(url.searchParams.get('expires')),
    action,
    url.searchParams.get('sig') ?? '',
  )
  return ok && url.searchParams.get('action') === action ? { bucket: bucket as Bucket, key } : null
}

export async function PUT(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const target = await check(request, ctx, 'write')
  if (!target || target.bucket !== 'uploads') return new Response(null, { status: 404 })
  await writeLocalUpload(target.key, Buffer.from(await request.arrayBuffer()))
  return new Response(null, { status: 200 })
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const target = await check(request, ctx, 'read')
  if (!target) return new Response(null, { status: 404 })
  try {
    const data = await readLocalObject(target.bucket, target.key)
    const type = target.key.endsWith('.webp') ? 'image/webp' : target.key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store' } })
  } catch {
    return new Response(null, { status: 404 })
  }
}
