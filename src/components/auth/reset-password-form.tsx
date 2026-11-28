'use client'

import { useActionState } from 'react'

import { resetPassword } from '@/actions/auth'
import { FormMessage } from '@/components/forms/form-message'
import { PasswordField } from '@/components/forms/password-field'
import { SubmitButton } from '@/components/forms/submit-button'
import { idleFormState } from '@/lib/form-state'

export function ResetPasswordForm({ token }: { token: string }): React.JSX.Element {
  const [state, formAction] = useActionState(resetPassword, idleFormState)
  const errors = state.status === 'error' ? state.fieldErrors : undefined
  return (
    <form action={formAction} className="flex flex-col gap-md" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" showRules errors={errors?.password} />
      <PasswordField name="confirmPassword" label="Confirm new password" errors={errors?.confirmPassword} />
      <SubmitButton>Set new password</SubmitButton>
    </form>
  )
}
