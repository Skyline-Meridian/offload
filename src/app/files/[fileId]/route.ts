import { z } from 'zod'

import { FILE_URL_SECONDS } from '@/lib/constants'
import { getViewer } from '@/server/dal/viewer'
import { audit } from '@/server/audit'
import { runAsUser } from '@/server/context'
import { db } from '@/server/db'
import { canReadFile } from '@/server/policies/files'
import { storage } from '@/server/storage'

export async function GET(request: Request, ctx: { params: Promise<{ fileId: string }> }): Promise<Response> {
  const { fileId } = await ctx.params
  if (!z.uuid().safeParse(fileId).success) return new Response(null, { status: 404 })
  const viewer = await getViewer()
  const file = await db.file.findUnique({ where: { id: fileId } })
  if (!viewer || !file || file.status !== 'READY' || !(await canReadFile(viewer, file))) {
    return new Response(null, { status: 404 })
  }

  if (file.purpose === 'IDENTITY_DOCUMENT' && file.ownerId !== viewer.user.id) {
    await runAsUser(viewer.user.id, viewer.role, () =>
      db.$transaction((tx) =>
        audit(tx, {
          action: 'document.viewed',
          subjectType: 'File',
          subjectId: file.id,
          relatedUserIds: file.ownerId ? [file.ownerId] : [],
        }),
      ),
    )
  }

  const url = await storage.signedReadUrl('content', file.key, FILE_URL_SECONDS)
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(url, request.url).toString(), 'Cache-Control': 'private, no-store' },
  })
}
