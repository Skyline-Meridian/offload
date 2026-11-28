'use server'

import { z } from 'zod'

import { COOKIE_POLICY_VERSION } from '@/lib/constants'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'

const schema = z.object({ categories: z.array(z.enum(['necessary', 'maps'])).max(2) })

/** Stores the cookie choice for a signed-in user. Visitors without an account keep it in the cookie only. */
export async function saveCookieConsent(input: { categories: string[] }): Promise<void> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return
  const viewer = await getViewer()
  if (!viewer) return
  await db.cookieConsent.create({
    data: { userId: viewer.user.id, categories: parsed.data.categories, policyVersion: COOKIE_POLICY_VERSION },
  })
}
