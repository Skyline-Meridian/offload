'use client'

import { useActionState } from 'react'

import { cancelSubscription, cancelSwitch, openBillingPortal, switchPlan, undoCancellation } from '@/actions/billing'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { Alert } from '@/components/ui/alert'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/format/date'
import { formatMoney } from '@/lib/format/money'
import { idleFormState, type FormState } from '@/lib/form-state'
import type { BillingDetails, ShownStatus, SubscriptionPageData } from '@/lib/view-models/billing'

const statusVariant: Record<ShownStatus, BadgeVariant> = { Trial: 'accent', Active: 'success', Cancelled: 'warning', 'Past due': 'error', Paused: 'warning', Ended: 'neutral' }

function ActionButton({ action, label, variant = 'ghost', confirm }: { action: () => Promise<FormState>; label: string; variant?: 'ghost' | 'danger' | 'primary'; confirm?: string }): React.JSX.Element {
  const [state, formAction, pending] = useActionState<FormState>(() => action(), idleFormState)
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
      className="flex flex-col gap-2xs"
    >
      <Button type="submit" size="sm" variant={variant} isDisabled={pending}>
        {label}
      </Button>
      <FormMessage state={state} />
    </form>
  )
}

function SwitchForm({ planId, label }: { planId: string; label: string }): React.JSX.Element {
  const [state, formAction] = useActionState(switchPlan, idleFormState)
  return (
    <form action={formAction} className="flex flex-col gap-2xs">
      <input type="hidden" name="planId" value={planId} />
      <SubmitButton size="sm" variant="ghost">
        {label}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  )
}

type Props = { subscription: SubscriptionPageData; details: BillingDetails | null }

export function SubscriptionPanel({ subscription: s, details }: Props): React.JSX.Element {
  const every = s.interval === 'MONTH' ? 'month' : 'year'
  return (
    <Card as="section" className="gap-md">
      <div className="flex flex-wrap items-center gap-sm">
        <h2 className="text-h3">{s.planName}</h2>
        <Badge variant={statusVariant[s.shownStatus]}>{s.shownStatus}</Badge>
      </div>
      {s.shownStatus === 'Past due' ? <Alert variant="error">Your payment failed. Update your payment method to keep your access.</Alert> : null}
      {s.isCancelledAtPeriodEnd && s.currentPeriodEnd ? <Alert variant="warning">Your subscription ends on {formatDate(s.currentPeriodEnd)}. You keep access until then.</Alert> : null}
      <dl className="grid gap-xs md:grid-cols-2">
        {(
          [
            ['Price', s.amountPence !== null ? `${formatMoney(s.amountPence)} per ${every}` : null],
            ['Started', formatDate(s.startedAt)],
            [s.isCancelledAtPeriodEnd ? 'Ends' : 'Next payment', s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : null],
            ['Bought by', s.purchasedBy],
            ['Card', details?.card ?? null],
            ['Waiting plan change', s.scheduledPlan ? `${s.scheduledPlan.name} (${formatMoney(s.scheduledPlan.amountPence)})` : null],
          ] as [string, string | null][]
        )
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-hint">{label}</dt>
              <dd className="text-body">{value}</dd>
            </div>
          ))}
      </dl>
      {details ? (
        <div className="flex flex-col gap-2xs">
          <h3 className="text-h5">Billing details</h3>
          <p className="text-body">{[details.billingName, details.company, details.email, details.phone, details.address].filter(Boolean).join(' · ') || 'None yet'}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start gap-sm">
        <ActionButton action={openBillingPortal} label="Update payment method" />
        <ActionButton action={openBillingPortal} label="Update billing details" />
        {s.isCancelledAtPeriodEnd ? (
          <ActionButton action={undoCancellation} label="Undo cancellation" variant="primary" />
        ) : (
          <ActionButton action={cancelSubscription} label="Cancel subscription" variant="danger" confirm="Cancel your subscription at the end of the period?" />
        )}
        {s.scheduledPlan ? (
          <ActionButton action={cancelSwitch} label="Cancel plan change" />
        ) : s.switchTarget && !s.isCancelledAtPeriodEnd ? (
          <SwitchForm planId={s.switchTarget.id} label={`Switch to ${s.switchTarget.name} (${formatMoney(s.switchTarget.amountPence)}) at the end of the period`} />
        ) : null}
      </div>
    </Card>
  )
}
