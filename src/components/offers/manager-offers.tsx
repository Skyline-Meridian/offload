'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { closeOfferAction, copyOfferAction, deleteOfferAction } from '@/actions/offer'
import { FormMessage } from '@/components/forms/form-message'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/format/date'
import { idleFormState } from '@/lib/form-state'
import { routes } from '@/lib/routes'
import type { ManagerOfferRow } from '@/lib/view-models/offers'

const statusBadge: Record<ManagerOfferRow['status'], { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  PENDING: { label: 'Pending', variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'neutral' },
  EXPIRED: { label: 'Expired', variant: 'neutral' },
}

function OfferAction({ action, offerId, label, variant, confirm }: { action: typeof closeOfferAction; offerId: string; label: string; variant?: 'ghost' | 'danger'; confirm?: string }): React.JSX.Element {
  const [state, formAction, pending] = useActionState(action, idleFormState)
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
      className="flex flex-col gap-2xs"
    >
      <input type="hidden" name="offerId" value={offerId} />
      <Button type="submit" size="sm" variant={variant ?? 'ghost'} isDisabled={pending}>
        {label}
      </Button>
      <FormMessage state={state} />
    </form>
  )
}

export function ManagerOffers({ offers }: { offers: ManagerOfferRow[] }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-sm">
      {offers.map((o) => (
        <li key={o.id}>
          <Card as="div">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-h4">{o.title}</h2>
              <Badge variant={statusBadge[o.status].variant}>{statusBadge[o.status].label}</Badge>
              {o.closedByStaff ? <Badge variant="error">Closed by Offload</Badge> : null}
            </div>
            {o.closedByStaff && o.closedReason ? <p className="text-body">Reason: {o.closedReason}</p> : null}
            <p className="text-hint">
              {o.publishedAt ? `Published ${formatDate(o.publishedAt)}` : 'Not published'}
              {o.expiresAt ? ` · Expires ${formatDate(o.expiresAt)}` : ''} · {o.applicationCount} {o.applicationCount === 1 ? 'application' : 'applications'}
            </p>
            <div className="flex flex-wrap items-start gap-sm">
              {['DRAFT', 'PENDING', 'PUBLISHED'].includes(o.status) ? (
                <LinkButton href={`${routes.myOffers}/${o.id}/edit`} size="sm" variant="ghost">
                  Edit
                </LinkButton>
              ) : null}
              {o.status === 'PUBLISHED' ? (
                <>
                  <Link href={routes.offer(o.id)} className="text-link self-center">
                    View
                  </Link>
                  <OfferAction action={closeOfferAction} offerId={o.id} label="Close" confirm="Close this offer?" />
                </>
              ) : null}
              {o.canCopy ? <OfferAction action={copyOfferAction} offerId={o.id} label="Copy" /> : null}
              {o.applicationCount === 0 ? <OfferAction action={deleteOfferAction} offerId={o.id} label="Delete" variant="danger" confirm="Delete this offer?" /> : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
