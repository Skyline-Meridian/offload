import type { Metadata } from 'next'
import { cacheLife, cacheTag } from 'next/cache'
import { Suspense } from 'react'

import { PricingTable, type BuyState } from '@/components/billing/pricing-table'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { listActivePlans, hasPaidSubscription } from '@/server/dal/billing'
import { getViewer } from '@/server/dal/viewer'
import { buyBlock, buyBlockMessages } from '@/server/policies/billing'

export const metadata: Metadata = { title: 'Pricing', description: 'Plans for clubs, unions, colleges, universities and brands.' }

async function getCachedPlans() {
  'use cache'
  cacheTag('plans')
  cacheLife('hours')
  return listActivePlans()
}

/** The buy state of every plan for this viewer (SUB-1.2). Runs per request, inside Suspense. */
async function Plans(): Promise<React.JSX.Element> {
  const [plans, viewer] = await Promise.all([getCachedPlans(), getViewer()])
  const paid = viewer?.organisation ? await hasPaidSubscription(viewer.organisation.id) : false
  const states: Record<string, BuyState> = {}
  for (const plan of plans) {
    const block = buyBlock(viewer, { organisationType: plan.organisationType, isActive: true }, paid)
    states[plan.id] = block === null ? { allowed: true } : { allowed: false, reason: buyBlockMessages[block], showLogin: block === 'login' }
  }
  return <PricingTable plans={plans} states={states} />
}

export default function PricingPage(): React.JSX.Element {
  return (
    <main>
      <PageHeader title="Pricing" eyebrow="Plans">
        Choose the plan for your organisation. Cancel at any time.
      </PageHeader>
      <Container className="py-xl">
        <Suspense fallback={<Spinner />}>
          <Plans />
        </Suspense>
      </Container>
    </main>
  )
}
