import { Container } from '@/components/layout/container'
import { LinkButton } from '@/components/ui/button'
import { routes } from '@/lib/routes'

export default function NotFound(): React.JSX.Element {
  return (
    <main>
      <Container size="narrow" className="flex flex-col items-start gap-md py-4xl">
        <p className="text-eyebrow">404</p>
        <h1 className="text-h2">We could not find that page</h1>
        <LinkButton href={routes.home}>Back to the home page</LinkButton>
      </Container>
    </main>
  )
}
