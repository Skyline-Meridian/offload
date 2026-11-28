import { Loader2 } from 'lucide-react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }): React.JSX.Element {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <Icon icon={Loader2} className="animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
