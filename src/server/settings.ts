import 'server-only'

import { cache } from 'react'

import type { Prisma } from '@/generated/prisma/client'
import { db } from '@/server/db'

/** Reads all settings once per request. */
const loadSettings = cache(async (): Promise<Map<string, unknown>> => {
  const rows = await db.setting.findMany()
  return new Map(rows.map((r) => [r.key, r.value]))
})

export async function getSetting<T>(key: string): Promise<T | null> {
  const all = await loadSettings()
  return (all.get(key) as T | undefined) ?? null
}

export async function setSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
}
