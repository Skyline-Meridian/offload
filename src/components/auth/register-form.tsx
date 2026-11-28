'use client'

import Link from 'next/link'

import { register } from '@/actions/auth'
import { FormMessage } from '@/components/forms/form-message'
import { Honeypot } from '@/components/forms/honeypot'
import { PasswordField } from '@/components/forms/password-field'
import { SubmitButton } from '@/components/forms/submit-button'
import { Checkbox } from '@/components/ui/checkbox'
import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { useCaptchaAction } from '@/hooks/use-captcha-action'
import { routes } from '@/lib/routes'

const roleOptions: SelectOption[] = [
  { value: 'PLAYER', label: 'Player' },
  { value: 'CLUB', label: 'Club manager' },
  { value: 'UNION', label: 'Union manager' },
  { value: 'INSTITUTION', label: 'College / University manager' },
  { value: 'BRAND', label: 'Brand manager' },
]

type Props = {
  countries: SelectOption[]
  defaultRole?: string
}

export function RegisterForm({ countries, defaultRole }: Props): React.JSX.Element {
  const [state, formAction] = useCaptchaAction(register, 'register')
  const errors = state.status === 'error' ? state.fieldErrors : undefined
  return (
    <form action={formAction} className="flex flex-col gap-md" noValidate>
      <FormMessage state={state} />
      <Honeypot />
      <Select name="registerAs" label="Registering as" options={roleOptions} placeholder="Choose…" required defaultValue={defaultRole} errors={errors?.registerAs} />
      <div className="grid gap-md md:grid-cols-2">
        <TextField name="firstName" label="First name" autoComplete="given-name" isRequired errors={errors?.firstName} />
        <TextField name="lastName" label="Last name" autoComplete="family-name" isRequired errors={errors?.lastName} />
      </div>
      <TextField name="email" label="Email" type="email" autoComplete="email" isRequired errors={errors?.email} />
      <PasswordField label="Password" showRules errors={errors?.password} />
      <PasswordField name="confirmPassword" label="Confirm password" errors={errors?.confirmPassword} />
      <TextField name="dateOfBirth" label="Date of birth" type="date" autoComplete="bday" isRequired errors={errors?.dateOfBirth} />
      <Select
        name="nationalities"
        label="Nationality"
        options={countries}
        multiple
        required
        hint="Hold Ctrl (Cmd on a Mac) to choose more than one."
        errors={errors?.nationalities}
      />
      <Checkbox name="isNewsletterOptedIn">Sign me up to the Offload newsletter</Checkbox>
      <div className="flex flex-col gap-2xs">
        <Checkbox name="acceptTerms" isRequired isInvalid={Boolean(errors?.acceptTerms)}>
          I accept the{' '}
          <Link href={routes.terms} className="text-link" target="_blank">
            terms and conditions
          </Link>
        </Checkbox>
        {errors?.acceptTerms ? <p className="text-body text-error">{errors.acceptTerms.join(' ')}</p> : null}
      </div>
      <SubmitButton>Create account</SubmitButton>
      <p className="text-body">
        Already registered?{' '}
        <Link href={routes.login} className="text-link">
          Sign in
        </Link>
      </p>
    </form>
  )
}
