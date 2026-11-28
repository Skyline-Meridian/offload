import type { OrgTypeKey } from '@/lib/constants'

export type OrganisationEditorData = {
  id: string
  type: OrgTypeKey
  slug: string
  status: string
  statusReason: string
  name: string
  logoFileId: string
  officialEmail: string
  officialPhone: string
  website: string
  foundedYear: string
  description: string
  address: {
    addressLine1: string
    addressLine2: string
    city: string
    region: string
    postcode: string
    country: string
    mapAddress: string
    placeId: string
  }
  registrationNumber: string
  trainingGround: string
  trainingGroundPlaceId: string
  playingGround: string
  playingGroundPlaceId: string
  previousResults: string
  level: string
  leagueIds: string[]
  institutionKind: string
  industryId: string
  industryOther: string
  social: Record<'facebookUrl' | 'instagramUrl' | 'linkedinUrl' | 'xUrl' | 'youtubeUrl', string>
  documentFileId: string
  coaches: { id: string; name: string; jobRole: string; startDate: string; endDate: string; photoFileId: string }[]
  seasons: { id: string; label: string; startDate: string; endDate: string }[]
  sessions: { id: string; day: string; startTime: string; endTime: string }[]
  pathways: { id: string; institutionId: string; institutionText: string; institutionName: string }[]
  pendingChanges: { label: string; value: string }[]
  otherManagers: string[]
  canResubmit: boolean
}

export type OrganisationEditorReference = {
  countries: { value: string; label: string }[]
  leagues: { value: string; label: string }[]
  industries: { value: string; label: string }[]
}
