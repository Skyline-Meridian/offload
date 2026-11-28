'use client'

import { useState } from 'react'

import { subscribeToPlan } from '@/actions/billing'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { Button, LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSection } from '@/hooks/use-section'
import { ORG_TYPE_LABELS, type OrgTypeKey } from '@/lib/constants'
import { formatMoney } from '@/lib/format/money'
import { loginWithNext, routes } from '@/lib/routes'
import type { PlanCardData } from '@/lib/view-models/billing'

export type BuyState = { allowed: true } | { allowed: false; reason: string; showLogin?: boolean }

const order: OrgTypeKey[] = ['CLUB', 'UNION', 'INSTITUTION', 'BRAND']

function PlanCard({ plan, state }: { plan: PlanCardData; state: BuyState }): React.JSX.Element {
  const { state: result, formAction } = useSection(subscribeToPlan)
  return (
    <Card as="li" className="gap-xs">
      <h3 className="text-h4">{plan.name}</h3>
      <p className="text-h2">
        {formatMoney(plan.amountPence)}
        <span className="text-hint"> / {plan.interval === 'MONTH' ? 'month' : 'year'}</span>
      </p>
      {state.allowed ? (
        <form action={formAction} className="flex flex-col gap-xs">
          <FormMessage state={result} />
          <input type="hidden" name="planId" value={plan.id} />
          <SubmitButton>Subscribe</SubmitButton>
        </form>
      ) : (
        <>
          <p className="text-hint">{state.reason}</p>
          {state.showLogin ? <LinkButton href={loginWithNext(routes.pricing)}>Sign in</LinkButton> : null}
        </>
      )}
    </Card>
  )
}

type Props = {
  plans: PlanCardData[]
  /** Buy state of each plan for the person looking at the page. */
  states: Record<string, BuyState>
}

export function PricingTable({ plans, states }: Props): React.JSX.Element {
  const [interval, setInterval] = useState<'MONTH' | 'YEAR'>('MONTH')
  return (
    <div className="flex flex-col gap-lg">
      <div className="flex gap-xs" role="group" aria-label="Billing period">
        <Button variant={interval === 'MONTH' ? 'primary' : 'ghost'} size="sm" aria-pressed={interval === 'MONTH'} onPress={() => setInterval('MONTH')}>
          Monthly
        </Button>
        <Button variant={interval === 'YEAR' ? 'primary' : 'ghost'} size="sm" aria-pressed={interval === 'YEAR'} onPress={() => setInterval('YEAR')}>
          Annual
        </Button>
      </div>
      {order.map((type) => {
        const plan = plans.find((p) => p.organisationType === type && p.interval === interval)
        if (!plan) return null
        return (
          <section key={type} aria-labelledby={`plans-${type}`} className="flex flex-col gap-xs">
            <h2 id={`plans-${type}`} className="text-h3">
              {ORG_TYPE_LABELS[type]}
            </h2>
            <ul className="grid gap-md md:grid-cols-2">
              <PlanCard plan={plan} state={states[plan.id] ?? { allowed: false, reason: '' }} />
            </ul>
          </section>
        )
      })}
    </div>
  )
}
