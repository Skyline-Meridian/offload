'use client'

import { useActionState } from 'react'

import { idleFormState, type FormState } from '@/lib/form-state'

type ServerAction = (prev: FormState, formData: FormData) => Promise<FormState>

/** State of one form section: the last result, the field errors by name, and the action to put on the form. */
export function useSection(action: ServerAction): {
  state: FormState
  formAction: (formData: FormData) => void
  errors: (name: string) => string[] | undefined
} {
  const [state, formAction] = useActionState(action, idleFormState)
  return {
    state,
    formAction,
    errors: (name) => (state.status === 'error' ? state.fieldErrors?.[name] : undefined),
  }
}
