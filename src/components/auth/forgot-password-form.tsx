'use client'

import { forgotPassword } from '@/actions/auth'
import { FormMessage } from '@/components/forms/form-message'
import { SubmitButton } from '@/components/forms/submit-button'
import { TextField } from '@/components/ui/input'
import { useCaptchaAction } from '@/hooks/use-captcha-action'

export function ForgotPasswordForm(): React.JSX.Element {
  const [state, formAction] = useCaptchaAction(forgotPassword, 'forgot_password')
  const errors = state.status === 'error' ? state.fieldErrors : undefined
  return (
    <form action={formAction} className="flex flex-col gap-md" noValidate>
      <FormMessage state={state} />
      <TextField name="email" label="Email" type="email" autoComplete="email" isRequired errors={errors?.email} />
      <SubmitButton>Send reset link</SubmitButton>
    </form>
  )
}
