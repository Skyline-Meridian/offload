'use client'

import { useFormStatus } from 'react-dom'

import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** A submit button that is disabled and shows a spinner while its form is being sent. */
export function SubmitButton({ children, variant, size, className }: Props): React.JSX.Element {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} size={size} className={className} isDisabled={pending}>
      {pending ? <Spinner label="Saving" /> : null}
      {children}
    </Button>
  )
}
