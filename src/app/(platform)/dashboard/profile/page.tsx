import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { toEditorData } from '@/components/players/editor/editor-data'
import { PlayerEditor } from '@/components/players/editor/player-editor'
import { loginWithNext, routes } from '@/lib/routes'
import { getOwnPlayerProfile, getPlayerReferenceData } from '@/server/dal/players'
import { getViewer } from '@/server/dal/viewer'
import { completenessFor } from '@/server/services/players/completeness'

export const metadata: Metadata = { title: 'My profile' }

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(`${routes.dashboard}/profile`))
  // The manager profile page is added with the organisation module.
  if (viewer.role !== 'PLAYER') notFound()

  const [profile, reference] = await Promise.all([getOwnPlayerProfile(viewer.user.id), getPlayerReferenceData()])
  if (!profile) notFound()
  const completeness = await completenessFor(profile)

  return (
    <main>
      <PageHeader title="My profile" eyebrow="Player">
        <label className="flex flex-col gap-2xs">
          <span className="text-body">Your profile is {completeness.percent}% complete</span>
          <progress value={completeness.percent} max={100} className="w-full" />
        </label>
      </PageHeader>
      <Container size="narrow" className="py-xl">
        <PlayerEditor
          data={toEditorData({ ...profile, user: profile.user })}
          reference={{
            positions: reference.positions.map((p) => ({ value: p.id, label: p.label })),
            skills: reference.skills.map((s) => ({ value: s.id, label: s.label, kind: s.kind })),
            qualifications: reference.qualifications.map((q) => ({ value: q.id, label: q.label })),
            countries: reference.countries.map((c) => ({ value: c.code, label: c.name })),
          }}
        />
      </Container>
    </main>
  )
}
