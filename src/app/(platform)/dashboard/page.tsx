import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { logout } from '@/actions/auth'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { loginWithNext, routes } from '@/lib/routes'
import { getViewer } from '@/server/dal/viewer'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(routes.dashboard))
  return (
    <main>
      <Container className="flex flex-col items-start gap-md py-3xl">
        <h1 className="text-h2">Welcome, {viewer.user.firstName ?? 'there'}</h1>
        <form action={logout}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </Container>
    </main>
  )
}
