import { Container } from '@/components/layout/container'
import { LinkButton } from '@/components/ui/button'
import { loginWithNext, routes } from '@/lib/routes'
import { messages } from '@/lib/messages'

type GateProps = { title: string; children: React.ReactNode; action: React.ReactNode }

function Gate({ title, children, action }: GateProps): React.JSX.Element {
  return (
    <main>
      <Container size="narrow" className="flex flex-col items-start gap-md py-4xl">
        <h1 className="text-h2">{title}</h1>
        <p className="text-body">{children}</p>
        {action}
      </Container>
    </main>
  )
}

export function LoginRequired({ next }: { next: string }): React.JSX.Element {
  return (
    <Gate title="Sign in to continue" action={<LinkButton href={loginWithNext(next)}>Sign in</LinkButton>}>
      {messages.loginRequired}
    </Gate>
  )
}

export function VerificationRequired({ isEmailVerified }: { isEmailVerified: boolean }): React.JSX.Element {
  return (
    <Gate
      title="Verification needed"
      action={<LinkButton href={`${routes.dashboard}/verification`}>{isEmailVerified ? 'Verify my identity' : 'Verify my email'}</LinkButton>}
    >
      {messages.verificationRequired}
    </Gate>
  )
}

export function SubscriptionRequired({ message }: { message: string }): React.JSX.Element {
  return (
    <Gate title="Subscription needed" action={<LinkButton href={routes.pricing}>See plans</LinkButton>}>
      {message}
    </Gate>
  )
}
