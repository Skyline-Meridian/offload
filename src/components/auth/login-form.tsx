'use client'

import Link from 'next/link'

import { login } from '@/actions/auth'
import { FormMessage } from '@/components/forms/form-message'
import { PasswordField } from '@/components/forms/password-field'
import { SubmitButton } from '@/components/forms/submit-button'
import { TextField } from '@/components/ui/input'
import { useCaptchaAction } from '@/hooks/use-captcha-action'
import { routes } from '@/lib/routes'

export function LoginForm({ next }: { next?: string }): React.JSX.Element {
  const [state, formAction] = useCaptchaAction(login, 'login')
  const errors = state.status === 'error' ? state.fieldErrors : undefined
  return (
    <form action={formAction} className="flex flex-col gap-md" noValidate>
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField name="email" label="Email" type="email" autoComplete="email" isRequired errors={errors?.email} />
      <PasswordField label="Password" autoComplete="current-password" errors={errors?.password} />
      <Link href={routes.forgotPassword} className="text-link">
        Forgot your password?
      </Link>
      <SubmitButton>Sign in</SubmitButton>
      <p className="text-body">
        New to Offload?{' '}
        <Link href={routes.register} className="text-link">
          Create an account
        </Link>
      </p>
    </form>
  )
}
