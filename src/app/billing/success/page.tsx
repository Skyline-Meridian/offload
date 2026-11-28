import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { RefreshWhile } from '@/components/billing/refresh-while'
import { Container } from '@/components/layout/container'
import { LinkButton } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { DomainError } from '@/lib/errors'
import { formatDate } from '@/lib/format/date'
import { formatMoney } from '@/lib/format/money'
import { loginWithNext, routes } from '@/lib/routes'
import { getViewer } from '@/server/dal/viewer'
import { errorInfo, log } from '@/server/log'
import { completeCheckout, type CheckoutResult } from '@/server/services/billing/checkout'

export const metadata: Metadata = { title: 'Payment received' }

export default function BillingSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): React.JSX.Element {
  return (
    <Suspense fallback={<Spinner />}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  )
}

async function SuccessContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.subscription))
  const params = await searchParams
  const sessionId = typeof params.session_id === 'string' ? params.session_id : ''

  let result: CheckoutResult = { state: 'failed' }
  if (/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    try {
      result = await completeCheckout(viewer, sessionId)
    } catch (error) {
      if (!(error instanceof DomainError)) log.error('checkout success failed', errorInfo(error))
    }
  }

  return (
    <main>
      <Container size="narrow" className="flex flex-col items-start gap-md py-3xl">
        {result.state === 'done' ? (
          <>
            <h1 className="text-h2">Thank you, you are subscribed</h1>
            <p className="text-body">
              Plan: {result.planName}. Price: {formatMoney(result.amountPence)}.{result.nextDate ? ` Next payment: ${formatDate(result.nextDate)}.` : ''}
            </p>
            <LinkButton href={routes.subscription}>Go to your subscription</LinkButton>
          </>
        ) : result.state === 'waiting' ? (
          <>
            <h1 className="text-h2">Finishing your payment…</h1>
            <p className="text-body">This usually takes a few seconds.</p>
            <RefreshWhile seconds={20} />
          </>
        ) : (
          <>
            <h1 className="text-h2">We could not confirm a payment</h1>
            <Alert variant="warning">If you were charged, your subscription will appear on your subscription page shortly.</Alert>
            <LinkButton href={routes.subscription}>Go to your subscription</LinkButton>
          </>
        )}
      </Container>
    </main>
  )
}
