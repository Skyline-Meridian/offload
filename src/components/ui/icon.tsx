import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'

type Props = {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Set only for an icon that carries meaning on its own. Decorative icons are hidden from screen readers. */
  label?: string
}

const sizes = { sm: 'size-icon-sm', md: 'size-icon-md', lg: 'size-icon-lg' } as const

export function Icon({ icon: Component, size = 'md', className, label }: Props): React.JSX.Element {
  return (
    <Component
      className={cn(sizes[size], 'shrink-0', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  )
}
