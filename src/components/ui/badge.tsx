import { cn } from '@/lib/cn'

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'warning' | 'error'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface text-heading',
  accent: 'bg-accent text-white',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  error: 'bg-error-surface text-error',
}

type Props = {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: Props): React.JSX.Element {
  return (
    <span className={cn('text-accent inline-flex items-center rounded-pill px-xs py-2xs', variants[variant], className)}>
      {children}
    </span>
  )
}
