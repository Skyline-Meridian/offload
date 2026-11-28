import type { Metadata } from 'next'

import { ResendVerification } from '@/components/auth/resend-verification'
import { AuthPage } from '@/components/layout/auth-page'
import { LinkButton } from '@/components/ui/button'
import { routes } from '@/lib/routes'

export const metadata: Metadata = { title: 'Verify your email' }

/** Better Auth sends the user here after the link in the email is opened. `error` is set when it failed. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  if (params.error) {
    return (
      <AuthPage title="This link did not work" intro="The link is invalid, has expired or has already been used.">
        <ResendVerification />
      </AuthPage>
    )
  }
  return (
    <AuthPage title="Email verified" intro="Thank you. Your email address is now verified.">
      <LinkButton href={routes.dashboard}>Go to my dashboard</LinkButton>
    </AuthPage>
  )
}
