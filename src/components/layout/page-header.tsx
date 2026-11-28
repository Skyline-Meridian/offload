import { Container } from '@/components/layout/container'
import { cn } from '@/lib/cn'

type Props = {
  title: string
  eyebrow?: string
  children?: React.ReactNode
  className?: string
}

/** Page title block with an optional small label above and intro text below. */
export function PageHeader({ title, eyebrow, children, className }: Props): React.JSX.Element {
  return (
    <header className={cn('bg-surface py-3xl', className)}>
      <Container className="flex flex-col gap-xs">
        {eyebrow ? <p className="text-eyebrow">{eyebrow}</p> : null}
        <h1 className="text-h2">{title}</h1>
        {children ? <div className="text-body max-w-narrow">{children}</div> : null}
      </Container>
    </header>
  )
}
