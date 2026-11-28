'use client'

import { useActionState } from 'react'

import { resendVerificationEmail } from '@/actions/auth'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { idleFormState, type FormState } from '@/lib/form-state'

/** Asks for a new verification link. The user must be signed in. */
export function ResendVerification(): React.JSX.Element {
  const [state, formAction] = useActionState<FormState>(() => resendVerificationEmail(), idleFormState)
  return (
    <form action={formAction} className="flex flex-col gap-md">
      <FormMessage state={state} />
      <SubmitButton>Send me a new link</SubmitButton>
    </form>
  )
}
