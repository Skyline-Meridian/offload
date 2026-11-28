import { timingSafeEqual } from 'node:crypto'

import { connection } from 'next/server'

import { env } from '@/server/env'
import { runAsSystem } from '@/server/context'
import { isJobName, jobs } from '@/server/jobs'
import { errorInfo, log } from '@/server/log'

function secretMatches(header: string | null): boolean {
  const given = Buffer.from(header?.replace(/^Bearer /, '') ?? '')
  const expected = Buffer.from(env.JOB_SECRET)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function POST(request: Request, ctx: { params: Promise<{ job: string }> }): Promise<Response> {
  await connection()
  if (!secretMatches(request.headers.get('authorization'))) return new Response(null, { status: 401 })
  const { job } = await ctx.params
  if (!isJobName(job)) return new Response(null, { status: 404 })
  try {
    const result = await runAsSystem(`job:${job}`, () => jobs[job]!())
    log.info('job finished', { job, ...result })
    return Response.json({ ok: true, result })
  } catch (error) {
    log.error('job failed', { job, ...errorInfo(error) })
    return Response.json({ ok: false }, { status: 500 })
  }
}
