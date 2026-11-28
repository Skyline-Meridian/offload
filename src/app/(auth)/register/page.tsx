import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { RegisterForm } from '@/components/auth/register-form'
import { AuthPage } from '@/components/layout/auth-page'
import { routes } from '@/lib/routes'
import { getViewer } from '@/server/dal/viewer'
import { db } from '@/server/db'

export const metadata: Metadata = { title: 'Create an account' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  if (await getViewer()) redirect(routes.dashboard)
  const [countries, industries] = await Promise.all([
    db.country.findMany({ orderBy: { name: 'asc' }, select: { code: true, name: true } }),
    db.industry.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } }),
  ])
  const defaultRole = typeof params.as === 'string' ? params.as.toUpperCase() : undefined
  return (
    <AuthPage title="Create an account">
      <RegisterForm
        countries={countries.map((c) => ({ value: c.code, label: c.name }))}
        industries={industries.map((i) => ({ value: i.id, label: i.label }))}
        defaultRole={defaultRole}
      />
    </AuthPage>
  )
}
