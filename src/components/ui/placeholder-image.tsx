import { ImageOff } from 'lucide-react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/** Shown where an image is missing. Fills its parent. */
export function PlaceholderImage({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('flex size-full items-center justify-center bg-surface text-text-light', className)}>
      <Icon icon={ImageOff} size="lg" />
    </div>
  )
}
