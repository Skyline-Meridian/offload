'use client'

import { useActionState } from 'react'

import { useRecaptcha } from '@/hooks/use-recaptcha'
import { idleFormState, type FormState } from '@/lib/form-state'

type ServerAction = (prev: FormState, formData: FormData) => Promise<FormState>

/** Like useActionState, but adds a reCAPTCHA token to the form data before the Server Action runs. */
export function useCaptchaAction(
  action: ServerAction,
  captchaAction: string,
): [FormState, (formData: FormData) => void, boolean] {
  const getToken = useRecaptcha()
  return useActionState<FormState, FormData>(async (prev, formData) => {
    formData.set('captchaToken', await getToken(captchaAction))
    return action(prev, formData)
  }, idleFormState)
}
