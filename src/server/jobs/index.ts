import 'server-only'

import { billing } from '@/server/jobs/billing'
import { billingReconciliation } from '@/server/jobs/billing-reconciliation'
import { billingRetention } from '@/server/jobs/billing-retention'
import { cleanup } from '@/server/jobs/cleanup'
import { offerExpiry } from '@/server/jobs/offer-expiry'

export type Job = () => Promise<Record<string, number | string | boolean>>

/** Every scheduled job the web app can run. Each one works from the current state, so running it twice is safe. */
export const jobs: Record<string, Job> = {
  cleanup,
  'offer-expiry': offerExpiry,
  billing,
  'billing-reconciliation': billingReconciliation,
  'billing-retention': billingRetention,
}

export function isJobName(name: string): boolean {
  return Object.hasOwn(jobs, name)
}
