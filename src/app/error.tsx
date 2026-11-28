'use client'

import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/messages'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }): React.JSX.Element {
  return (
    <main>
      <Container size="narrow" className="flex flex-col items-start gap-md py-4xl">
        <h1 className="text-h2">{messages.genericError}</h1>
        <Button onPress={reset}>Try again</Button>
      </Container>
    </main>
  )
}
