'use client'

import { useActionState } from 'react'

import { leaveOrganisation, resubmitOrganisation } from '@/actions/organisation'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import type { OrganisationEditorData } from '@/components/organisations/editor/types'
import { Alert } from '@/components/ui/alert'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { idleFormState, type FormState } from '@/lib/form-state'

const statusLabels: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  PENDING: { label: 'Waiting for review', variant: 'warning' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  REJECTED: { label: 'Not approved', variant: 'error' },
  UNPUBLISHED: { label: 'Unpublished', variant: 'warning' },
  BANNED: { label: 'Banned', variant: 'error' },
}

export function StatusPanel({ data }: { data: OrganisationEditorData }): React.JSX.Element {
  const [resubmitState, resubmit] = useActionState<FormState>(() => resubmitOrganisation(), idleFormState)
  const [leaveState, leave] = useActionState<FormState>(() => leaveOrganisation(), idleFormState)
  const status = statusLabels[data.status] ?? { label: data.status, variant: 'neutral' as BadgeVariant }
  return (
    <Card className="gap-sm">
      <div className="flex flex-wrap items-center gap-sm">
        <h2 className="text-h4">Status</h2>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      {data.statusReason ? <Alert variant="warning">{data.statusReason}</Alert> : null}
      {data.pendingChanges.length > 0 ? (
        <Alert>
          <p className="text-h5">Changes awaiting review</p>
          <ul className="text-body list-disc pl-md">
            {data.pendingChanges.map((c) => (
              <li key={c.label}>
                {c.label}: {c.value}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {data.otherManagers.length > 0 ? <p className="text-body">Other managers: {data.otherManagers.join(', ')}</p> : null}
      {data.canResubmit ? (
        <form action={resubmit} className="flex flex-col gap-xs">
          <FormMessage state={resubmitState} />
          <SubmitButton className="self-start">Send for review again</SubmitButton>
        </form>
      ) : null}
      <form
        action={leave}
        className="flex flex-col gap-xs"
        onSubmit={(event) => {
          if (!window.confirm('Leave this organisation?')) event.preventDefault()
        }}
      >
        <FormMessage state={leaveState} />
        <SubmitButton variant="ghost" size="sm" className="self-start">
          Leave this organisation
        </SubmitButton>
      </form>
    </Card>
  )
}
