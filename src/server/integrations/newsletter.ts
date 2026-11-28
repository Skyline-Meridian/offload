import 'server-only'

import { env } from '@/server/env'
import { log } from '@/server/log'

const KIT = 'https://api.kit.com/v4'

function headers(): Record<string, string> {
  if (!env.KIT_API_KEY) throw new Error('KIT_API_KEY is not set')
  return { 'Content-Type': 'application/json', 'X-Kit-Api-Key': env.KIT_API_KEY }
}

/** In redirect mode no call is made, so real people are never added to the list from test data. */
function isLive(): boolean {
  if (env.OUTBOUND_MODE === 'live') return true
  log.info('newsletter call skipped (redirect mode)')
  return false
}

export async function subscribeToNewsletter(email: string, firstName: string | null): Promise<void> {
  if (!isLive()) return
  const created = await fetch(`${KIT}/subscribers`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email_address: email, first_name: firstName ?? undefined }),
  })
  if (!created.ok) throw new Error(`Kit responded with status ${created.status}`)
  if (env.KIT_TAG_ID) {
    const tagged = await fetch(`${KIT}/tags/${env.KIT_TAG_ID}/subscribers`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email_address: email }),
    })
    if (!tagged.ok) throw new Error(`Kit responded with status ${tagged.status}`)
  }
}

export async function unsubscribeFromNewsletter(email: string): Promise<void> {
  if (!isLive()) return
  const found = await fetch(`${KIT}/subscribers?email_address=${encodeURIComponent(email)}`, { headers: headers() })
  if (!found.ok) throw new Error(`Kit responded with status ${found.status}`)
  const body = (await found.json()) as { subscribers?: { id: number }[] }
  const id = body.subscribers?.[0]?.id
  if (!id) return
  const response = await fetch(`${KIT}/subscribers/${id}/unsubscribe`, { method: 'POST', headers: headers() })
  if (!response.ok) throw new Error(`Kit responded with status ${response.status}`)
}
