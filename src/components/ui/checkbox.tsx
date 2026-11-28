'use client'

import { Check } from 'lucide-react'
import { Checkbox as AriaCheckbox, type CheckboxProps } from 'react-aria-components'

import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/icon'

type Props = Omit<CheckboxProps, 'className' | 'children'> & {
  children: React.ReactNode
  className?: string
}

export function Checkbox({ children, className, ...rest }: Props): React.JSX.Element {
  return (
    <AriaCheckbox className={cn('group text-body flex items-start gap-xs', className)} {...rest}>
      <span className="bg-surface border-thin border-border flex size-icon-md shrink-0 items-center justify-center text-white group-data-selected:bg-accent group-data-selected:border-accent group-data-focus-visible:outline-2 group-data-invalid:border-error">
        <Icon icon={Check} size="sm" className="opacity-0 group-data-selected:opacity-100" />
      </span>
      <span>{children}</span>
    </AriaCheckbox>
  )
}
