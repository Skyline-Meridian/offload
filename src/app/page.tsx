import { LinkButton } from '@/components/ui/button'
import { Container } from '@/components/layout/container'
import { routes } from '@/lib/routes'

export default function HomePage(): React.JSX.Element {
  return (
    <main>
      <Container className="flex flex-col items-start gap-md py-4xl">
        <p className="text-eyebrow">Women&apos;s rugby recruitment</p>
        <h1 className="text-h1">Offload</h1>
        <p className="text-body max-w-narrow">
          Offload connects women&apos;s rugby players with clubs, unions, colleges, universities and brands.
        </p>
        <LinkButton href={routes.register}>Join Offload</LinkButton>
      </Container>
    </main>
  )
}
