import 'server-only'

import { env } from '@/server/env'

/**
 * Checks that a Google place id exists. With no key configured it returns true outside production,
 * so forms can be tested locally.
 */
export async function placeExists(placeId: string): Promise<boolean> {
  if (!env.GOOGLE_PLACES_SERVER_KEY) return env.NODE_ENV !== 'production'
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_SERVER_KEY, 'X-Goog-FieldMask': 'id' },
    })
    return response.ok
  } catch {
    return false
  }
}
