import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { SubscriptionPanel } from '@/components/billing/subscription-panel'
import { PricingTable, type BuyState } from '@/components/billing/pricing-table'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/format/date'
import { formatMoney } from '@/lib/format/money'
import { loginWithNext, routes } from '@/lib/routes'
import { getSubscriptionPage, hasPaidSubscription, listActivePlans } from '@/server/dal/billing'
import { getViewer } from '@/server/dal/viewer'
import { buyBlock, buyBlockMessages, canManageBilling } from '@/server/policies/billing'

export const metadata: Metadata = { title: 'Subscription' }

export default async function SubscriptionPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.subscription))
  if (viewer.role !== 'MANAGER') notFound()
  if (!canManageBilling(viewer)) {
    return (
      <main>
        <PageHeader title="Subscription" eyebrow="Manager" />
        <Container size="narrow" className="py-xl">
          <Alert variant="warning">You can manage the subscription once your account and organisation are approved.</Alert>
        </Container>
      </main>
    )
  }

  const organisationId = viewer.organisation.id
  const [data, plans, paid] = await Promise.all([getSubscriptionPage(organisationId), listActivePlans(), hasPaidSubscription(organisationId)])
  const buyable = plans.filter((p) => p.organisationType === viewer.organisation.type)
  const states: Record<string, BuyState> = {}
  for (const plan of buyable) {
    const block = buyBlock(viewer, { organisationType: plan.organisationType, isActive: true }, paid)
    states[plan.id] = block === null ? { allowed: true } : { allowed: false, reason: buyBlockMessages[block] }
  }

  return (
    <main>
      <PageHeader title="Subscription" eyebrow="Manager" />
      <Container className="flex flex-col gap-lg py-xl">
        {data.trial ? (
          <Alert variant="info">
            Free trial of {data.trial.planName}
            {data.trial.endsAt ? ` until ${formatDate(data.trial.endsAt)}` : ''}. Subscribe below and your paid plan starts when the trial ends.
          </Alert>
        ) : null}
        {data.subscription ? (
          <SubscriptionPanel subscription={data.subscription} details={data.details} />
        ) : (
          <>
            <EmptyState title="Not currently subscribed">Choose a plan to see players and manage offers and applications.</EmptyState>
            {buyable.length > 0 ? <PricingTable plans={buyable} states={states} /> : null}
          </>
        )}

        <section className="flex flex-col gap-xs" aria-labelledby="invoices">
          <h2 id="invoices" className="text-h3">
            Invoices
          </h2>
          {data.payments.length === 0 ? (
            <p className="text-body">No invoices yet.</p>
          ) : (
            <ul className="flex flex-col">
              {data.payments.map((p) => (
                <li key={p.id} className="border-border flex flex-wrap items-center justify-between gap-sm border-b py-xs">
                  <span className="text-body">
                    {p.invoiceNumber ?? 'Invoice'} · {formatDate(p.paidAt ?? p.createdAt)} · {formatMoney(p.amountPence)}
                    {p.amountRefundedPence > 0 ? ` (${formatMoney(p.amountRefundedPence)} refunded)` : ''}
                  </span>
                  <span className="flex items-center gap-sm">
                    <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'FAILED' ? 'error' : 'neutral'}>{p.status.toLowerCase()}</Badge>
                    {p.status === 'PAID' ? (
                      <Link href={`/billing/invoices/${p.id}`} className="text-link" prefetch={false}>
                        Download PDF
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  )
}
