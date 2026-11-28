'use client'

import { apply } from '@/actions/application'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { Alert } from '@/components/ui/alert'
import { LinkButton } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import { useSection } from '@/hooks/use-section'
import { loginWithNext, routes } from '@/lib/routes'

type Props = {
  offerId: string
  /** What the viewer can do: sign in, apply, see an existing application, or nothing. */
  mode: 'login' | 'apply' | 'applied' | 'reapply' | 'verify' | 'none'
  status?: string
}

const statusText: Record<string, string> = {
  SUBMITTED: 'Applied',
  SHORTLISTED: 'Applied: shortlisted',
  CONTACTED: 'Applied: contacted',
  REJECTED: 'Applied: not taken forward',
}

export function ApplyBox({ offerId, mode, status }: Props): React.JSX.Element | null {
  const { state, formAction, errors } = useSection(apply)
  if (mode === 'login') return <LinkButton href={loginWithNext(routes.offer(offerId))}>Sign in to apply</LinkButton>
  if (mode === 'verify') return <Alert variant="warning">Verify your email and your identity before you apply.</Alert>
  if (mode === 'applied') return <Alert variant="success">{statusText[status ?? 'SUBMITTED'] ?? 'Applied'}</Alert>
  if (mode === 'none') return null
  return (
    <form action={formAction} className="bg-surface flex flex-col gap-sm p-md" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="offerId" value={offerId} />
      <TextField name="note" label="Add a note (optional)" multiline rows={4} errors={errors('note')} hint="Up to 2,000 characters." />
      <SubmitButton className="self-start">{mode === 'reapply' ? 'Apply again' : 'Apply'}</SubmitButton>
    </form>
  )
}
