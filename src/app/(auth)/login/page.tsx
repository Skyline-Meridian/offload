import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/auth/login-form'
import { Alert } from '@/components/ui/alert'
import { AuthPage } from '@/components/layout/auth-page'
import { routes, safeNextPath } from '@/lib/routes'
import { getViewer } from '@/server/dal/viewer'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  const next = typeof params.next === 'string' ? safeNextPath(params.next, '') : ''
  if (await getViewer()) redirect(next || routes.dashboard)
  return (
    <AuthPage title="Sign in">
      {params.reset ? <Alert variant="success">Your password has been changed. Sign in with your new password.</Alert> : null}
      <LoginForm next={next || undefined} />
    </AuthPage>
  )
}
