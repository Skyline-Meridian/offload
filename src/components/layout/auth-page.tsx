import { Container } from '@/components/layout/container'

type Props = {
  title: string
  intro?: string
  children: React.ReactNode
}

/** Centered narrow page for sign-in style forms and short messages. */
export function AuthPage({ title, intro, children }: Props): React.JSX.Element {
  return (
    <main>
      <Container size="form" className="flex flex-col gap-lg py-3xl">
        <div className="flex flex-col gap-xs">
          <h1 className="text-h2">{title}</h1>
          {intro ? <p className="text-body">{intro}</p> : null}
        </div>
        {children}
      </Container>
    </main>
  )
}
