'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { changeApplicationStatus, withdraw } from '@/actions/application'
import { FormMessage } from '@/components/forms/form-message'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { UserAvatar } from '@/components/shared/user-avatar'
import { formatDate } from '@/lib/format/date'
import { idleFormState } from '@/lib/form-state'
import { routes } from '@/lib/routes'
import type { ManagerApplicationRow, PlayerApplicationRow } from '@/lib/view-models/offers'

const statusOptions = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'REJECTED', label: 'Rejected' },
]

function StatusForm({ row }: { row: ManagerApplicationRow }): React.JSX.Element {
  const [state, formAction] = useActionState(changeApplicationStatus, idleFormState)
  return (
    <form action={formAction} className="flex items-end gap-xs">
      <input type="hidden" name="applicationId" value={row.id} />
      <Select name="status" label="Status" options={statusOptions} defaultValue={row.status} />
      <Button type="submit" size="sm" variant="ghost">
        Update
      </Button>
      <FormMessage state={state} />
    </form>
  )
}

export function ManagerApplications({ rows }: { rows: ManagerApplicationRow[] }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-sm">
      {rows.map((r) => (
        <li key={r.id} className="bg-white border-thin border-border flex flex-col gap-xs p-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-sm">
            <UserAvatar fileId={r.pictureFileId} name={r.playerName} />
            <div className="flex flex-col">
              <Link href={routes.player(r.playerId)} className="text-h5">
                {r.playerName}
              </Link>
              <span className="text-body">{[r.primaryPosition, r.clubName].filter(Boolean).join(' · ')}</span>
              <span className="text-hint">
                {r.offerTitle} · {formatDate(r.createdAt)}
              </span>
              {r.note ? <span className="text-body whitespace-pre-line">{r.note}</span> : null}
            </div>
          </div>
          <StatusForm row={r} />
        </li>
      ))}
    </ul>
  )
}

const playerStatus: Record<string, string> = {
  SUBMITTED: 'Submitted',
  SHORTLISTED: 'Shortlisted',
  CONTACTED: 'Contacted',
  REJECTED: 'Not taken forward',
  WITHDRAWN: 'Withdrawn',
}

function WithdrawForm({ id }: { id: string }): React.JSX.Element {
  const [state, formAction, pending] = useActionState(withdraw, idleFormState)
  return (
    <form action={formAction} className="flex flex-col gap-2xs">
      <input type="hidden" name="applicationId" value={id} />
      <Button type="submit" size="sm" variant="ghost" isDisabled={pending}>
        Withdraw
      </Button>
      <FormMessage state={state} />
    </form>
  )
}

export function PlayerApplications({ rows }: { rows: PlayerApplicationRow[] }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-sm">
      {rows.map((r) => (
        <li key={r.id} className="bg-white border-thin border-border flex flex-col gap-xs p-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col">
            <Link href={routes.offer(r.offerId)} className="text-h5">
              {r.offerTitle}
            </Link>
            <span className="text-body">{r.organisationName}</span>
            <span className="text-hint">
              {formatDate(r.createdAt)} · {playerStatus[r.status]}
            </span>
          </div>
          {r.status !== 'WITHDRAWN' ? (
            <WithdrawForm id={r.id} />
          ) : r.offerIsOpen ? (
            <Link href={routes.offer(r.offerId)} className="text-link">
              Apply again
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
