import { cn } from '@/lib/cn'

type Props = {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, children, action, className }: Props): React.JSX.Element {
  return (
    <div className={cn('flex flex-col items-center gap-sm bg-surface p-xl text-center', className)}>
      <h2 className="text-h4">{title}</h2>
      {children ? <p className="text-body max-w-narrow">{children}</p> : null}
      {action}
    </div>
  )
}
