import { cn } from '@/lib/cn'

type Props = {
  children: React.ReactNode
  className?: string
  /** `content` is the full site width, `narrow` suits reading, `form` suits sign-in style forms. */
  size?: 'content' | 'narrow' | 'form'
  as?: 'div' | 'section' | 'main' | 'header' | 'footer'
}

const sizes = { content: 'max-w-content', narrow: 'max-w-narrow', form: 'max-w-form' } as const

export function Container({ children, className, size = 'content', as: Tag = 'div' }: Props): React.JSX.Element {
  return <Tag className={cn('mx-auto w-full px-xs', sizes[size], className)}>{children}</Tag>
}
