import { z } from 'zod'

import { DomainError } from '@/lib/errors'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { invoicePdfUrl } from '@/server/services/billing/checkout'

export async function GET(_request: Request, ctx: { params: Promise<{ paymentId: string }> }): Promise<Response> {
  const { paymentId } = await ctx.params
  const viewer = await getViewer()
  if (!viewer || !z.uuid().safeParse(paymentId).success) return new Response(null, { status: 404 })
  try {
    const url = await invoicePdfUrl(viewer, paymentId)
    return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (!(error instanceof DomainError)) log.error('invoice link failed', errorInfo(error))
    return new Response(null, { status: 404 })
  }
}
