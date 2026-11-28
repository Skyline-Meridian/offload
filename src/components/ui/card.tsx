import { cn } from '@/lib/cn'

type Props = {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'article' | 'section' | 'li'
}

/** A bordered white block. Compose the contents with children. */
export function Card({ children, className, as: Tag = 'div' }: Props): React.JSX.Element {
  return <Tag className={cn('bg-white border-thin border-border p-md flex flex-col gap-sm', className)}>{children}</Tag>
}
