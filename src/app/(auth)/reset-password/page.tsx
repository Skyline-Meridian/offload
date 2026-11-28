import type { Metadata } from 'next'
import Link from 'next/link'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { Alert } from '@/components/ui/alert'
import { AuthPage } from '@/components/layout/auth-page'
import { routes } from '@/lib/routes'

export const metadata: Metadata = { title: 'Reset password' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''
  if (!token || params.error) {
    return (
      <AuthPage title="Reset password">
        <Alert variant="error">This link is invalid or has expired.</Alert>
        <Link href={routes.forgotPassword} className="text-link">
          Request a new link
        </Link>
      </AuthPage>
    )
  }
  return (
    <AuthPage title="Reset password">
      <ResetPasswordForm token={token} />
    </AuthPage>
  )
}
