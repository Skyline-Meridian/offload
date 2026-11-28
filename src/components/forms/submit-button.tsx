'use client'

import { useFormStatus } from 'react-dom'

import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  /** Sent with the form, so one form can have several submit buttons (for example "Save draft" and "Publish"). */
  name?: string
  value?: string
}

/** A submit button that is disabled and shows a spinner while its form is being sent. */
export function SubmitButton({ children, variant, size, className, name, value }: Props): React.JSX.Element {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} size={size} className={className} isDisabled={pending} name={name} value={value}>
      {pending ? <Spinner label="Saving" /> : null}
      {children}
    </Button>
  )
}
