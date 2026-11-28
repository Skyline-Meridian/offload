import { notFound } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { Alert, Badge, Button, Card, Checkbox, EmptyState, LinkButton, Spinner, TextField } from '@/components/ui'
import { env } from '@/server/env'

export default function ComponentsPage(): React.JSX.Element {
  if (env.NODE_ENV === 'production') notFound()
  return (
    <main>
      <Container className="flex flex-col gap-xl py-3xl">
        <h1 className="text-h2">Components</h1>
        <section className="flex flex-col gap-sm">
          <h2 className="text-h3">Text styles</h2>
          <p className="text-h1">Heading 1</p>
          <p className="text-h2">Heading 2</p>
          <p className="text-subtitle">Subtitle</p>
          <p className="text-h3">Heading 3</p>
          <p className="text-h4">Heading 4</p>
          <p className="text-h5">Heading 5</p>
          <p className="text-eyebrow">Eyebrow</p>
          <p className="text-body">Body text</p>
          <p className="text-accent">Accent</p>
          <p className="text-hint">Hint</p>
        </section>
        <section className="flex flex-wrap gap-sm">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button isDisabled>Disabled</Button>
          <LinkButton href="/">Link button</LinkButton>
        </section>
        <section className="flex flex-wrap gap-sm">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Spinner />
        </section>
        <section className="flex max-w-form flex-col gap-md">
          <TextField label="Label" hint="A hint" name="demo" />
          <TextField label="With error" errors={['This is required.']} name="demo2" />
          <Checkbox>A checkbox</Checkbox>
        </section>
        <section className="flex flex-col gap-sm">
          <Alert>Info</Alert>
          <Alert variant="success">Success</Alert>
          <Alert variant="warning">Warning</Alert>
          <Alert variant="error">Error</Alert>
          <Card>
            <h3 className="text-h4">Card</h3>
            <p className="text-body">Card content.</p>
          </Card>
          <EmptyState title="Nothing here yet">Empty state text.</EmptyState>
        </section>
      </Container>
    </main>
  )
}
