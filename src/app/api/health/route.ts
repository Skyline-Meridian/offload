import { connection } from 'next/server'

import { db } from '@/server/db'

export async function GET(): Promise<Response> {
  await connection()
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
