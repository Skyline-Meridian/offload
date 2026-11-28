import 'server-only'

import { cleanup } from '@/server/jobs/cleanup'
import { offerExpiry } from '@/server/jobs/offer-expiry'

export type Job = () => Promise<Record<string, number | string | boolean>>

/** Every scheduled job the web app can run. Each one works from the current state, so running it twice is safe. */
export const jobs: Record<string, Job> = {
  cleanup,
  'offer-expiry': offerExpiry,
}

export function isJobName(name: string): boolean {
  return Object.hasOwn(jobs, name)
}
