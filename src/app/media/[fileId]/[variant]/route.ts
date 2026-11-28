import { z } from 'zod'

import { MEDIA_URL_SECONDS } from '@/lib/constants'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'
import { canReadMedia } from '@/server/policies/files'
import { storage } from '@/server/storage'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ fileId: string; variant: string }> },
): Promise<Response> {
  const { fileId, variant } = await ctx.params
  if (!z.uuid().safeParse(fileId).success) return new Response(null, { status: 404 })
  const file = await db.file.findUnique({ where: { id: fileId } })
  if (!file || file.status !== 'READY' || !file.variants.includes(variant)) return new Response(null, { status: 404 })
  if (!canReadMedia(await getViewer(), file.purpose)) return new Response(null, { status: 404 })

  const url = await storage.signedReadUrl('content', `${file.key}/${variant}.webp`, MEDIA_URL_SECONDS)
  // Local storage returns a path on this site; Cloud Storage returns an absolute address.
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(url, request.url).toString(), 'Cache-Control': 'private, max-age=3000' },
  })
}
