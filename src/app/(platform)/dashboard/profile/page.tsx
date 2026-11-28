import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { toEditorData } from '@/components/players/editor/editor-data'
import { PlayerEditor } from '@/components/players/editor/player-editor'
import { ManagerProfile } from '@/components/organisations/manager-profile'
import { toDateInputValue } from '@/lib/format/date'
import { getManagerIdentity } from '@/server/dal/organisations'
import { loginWithNext, routes } from '@/lib/routes'
import { getOwnPlayerProfile, getPlayerReferenceData } from '@/server/dal/players'
import { getViewer } from '@/server/dal/viewer'
import { completenessFor } from '@/server/services/players/completeness'

export const metadata: Metadata = { title: 'My profile' }

async function ManagerProfilePage({ userId }: { userId: string }): Promise<React.JSX.Element> {
  const [user, reference] = await Promise.all([getManagerIdentity(userId), getPlayerReferenceData()])
  if (!user) notFound()
  return (
    <main>
      <PageHeader title="My profile" eyebrow="Manager" />
      <Container size="narrow" className="py-xl">
        <ManagerProfile
          identity={{
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            dateOfBirth: toDateInputValue(user.dateOfBirth),
            nationalities: user.nationalities,
            personalPhone: user.personalPhone ?? '',
            bio: user.bio ?? '',
            profilePictureId: user.profilePictureId ?? '',
          }}
          reference={{
            positions: [],
            skills: [],
            qualifications: [],
            countries: reference.countries.map((c) => ({ value: c.code, label: c.name })),
          }}
          documentStatus={user.documentStatus}
          isEmailVerified={user.isEmailVerified}
        />
      </Container>
    </main>
  )
}

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()
  if (!viewer) redirect(loginWithNext(`${routes.dashboard}/profile`))
  if (viewer.role === 'MANAGER') return <ManagerProfilePage userId={viewer.user.id} />
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
