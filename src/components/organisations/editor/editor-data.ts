import type { OrganisationEditorData } from '@/components/organisations/editor/types'
import type { OrgTypeKey } from '@/lib/constants'
import { toDateInputValue } from '@/lib/format/date'

type Own = {
  id: string
  type: string
  slug: string
  status: string
  statusReason: string | null
  name: string
  logoFileId: string | null
  officialEmail: string | null
  officialPhone: string | null
  website: string | null
  foundedYear: number | null
  description: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postcode: string | null
  country: string | null
  mapAddress: string | null
  placeId: string | null
  registrationNumber: string | null
  trainingGround: string | null
  trainingGroundPlaceId: string | null
  playingGround: string | null
  playingGroundPlaceId: string | null
  previousResults: string | null
  level: string | null
  institutionKind: string | null
  industryId: string | null
  industryOther: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  linkedinUrl: string | null
  xUrl: string | null
  youtubeUrl: string | null
  documentFileId: string | null
  leagues: { leagueId: string }[]
  coaches: { id: string; name: string; jobRole: string; startDate: Date; endDate: Date | null; photoFileId: string | null }[]
  seasons: { id: string; label: string; startDate: Date; endDate: Date }[]
  trainingSessions: { id: string; day: string; startTime: string; endTime: string }[]
  pathways: { id: string; institutionId: string | null; institutionText: string | null; institution: { name: string } | null }[]
  changeRequests: { changes: unknown }[]
  members: { userId: string; user: { firstName: string | null; lastName: string | null } }[]
}

const s = (v: string | null | undefined): string => v ?? ''
const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const changeLabels: Record<string, string> = {
  name: 'Name',
  country: 'Country',
  registrationNumber: 'Registration number',
  documentFileId: 'Document',
}

export function toOrganisationEditorData(org: Own, viewerUserId: string): OrganisationEditorData {
  const pending = (org.changeRequests[0]?.changes ?? {}) as Record<string, unknown>
  return {
    id: org.id,
    type: org.type as OrgTypeKey,
    slug: org.slug,
    status: org.status,
    statusReason: s(org.statusReason),
    name: org.name,
    logoFileId: s(org.logoFileId),
    officialEmail: s(org.officialEmail),
    officialPhone: s(org.officialPhone),
    website: s(org.website),
    foundedYear: org.foundedYear?.toString() ?? '',
    description: s(org.description),
    address: {
      addressLine1: s(org.addressLine1),
      addressLine2: s(org.addressLine2),
      city: s(org.city),
      region: s(org.region),
      postcode: s(org.postcode),
      country: s(org.country),
      mapAddress: s(org.mapAddress),
      placeId: s(org.placeId),
    },
    registrationNumber: s(org.registrationNumber),
    trainingGround: s(org.trainingGround),
    trainingGroundPlaceId: s(org.trainingGroundPlaceId),
    playingGround: s(org.playingGround),
    playingGroundPlaceId: s(org.playingGroundPlaceId),
    previousResults: s(org.previousResults),
    level: s(org.level),
    leagueIds: org.leagues.map((l) => l.leagueId),
    institutionKind: s(org.institutionKind),
    industryId: s(org.industryId),
    industryOther: s(org.industryOther),
    social: {
      facebookUrl: s(org.facebookUrl),
      instagramUrl: s(org.instagramUrl),
      linkedinUrl: s(org.linkedinUrl),
      xUrl: s(org.xUrl),
      youtubeUrl: s(org.youtubeUrl),
    },
    documentFileId: s(org.documentFileId),
    coaches: org.coaches.map((c) => ({
      id: c.id,
      name: c.name,
      jobRole: c.jobRole,
      startDate: toDateInputValue(c.startDate),
      endDate: toDateInputValue(c.endDate),
      photoFileId: s(c.photoFileId),
    })),
    seasons: org.seasons.map((x) => ({ id: x.id, label: x.label, startDate: toDateInputValue(x.startDate), endDate: toDateInputValue(x.endDate) })),
    sessions: [...org.trainingSessions]
      .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.startTime.localeCompare(b.startTime))
      .map((x) => ({ id: x.id, day: x.day, startTime: x.startTime, endTime: x.endTime })),
    pathways: org.pathways.map((p) => ({ id: p.id, institutionId: s(p.institutionId), institutionText: s(p.institutionText), institutionName: s(p.institution?.name) })),
    pendingChanges: Object.entries(pending).map(([key, value]) => ({ label: changeLabels[key] ?? key, value: key === 'documentFileId' ? 'New document' : String(value ?? '') })),
    otherManagers: org.members.filter((m) => m.userId !== viewerUserId).map((m) => `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim()),
    canResubmit: org.status === 'REJECTED',
  }
}
