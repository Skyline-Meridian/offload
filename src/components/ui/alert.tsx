import { cn } from '@/lib/cn'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const variants: Record<AlertVariant, string> = {
  info: 'bg-surface border-border text-heading',
  success: 'bg-success-surface border-success text-success',
  warning: 'bg-warning-surface border-warning text-warning',
  error: 'bg-error-surface border-error text-error',
}

type Props = {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}

/** A message block. Errors are announced to screen readers straight away. */
export function Alert({ variant = 'info', children, className }: Props): React.JSX.Element {
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('text-body border-thin p-sm', variants[variant], className)}>
      {children}
    </div>
  )
}
