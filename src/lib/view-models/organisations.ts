import type { OrgTypeKey } from '@/lib/constants'

export type OrganisationCardData = {
  id: string
  type: OrgTypeKey
  slug: string
  name: string
  logoFileId: string | null
  /** "Club", "Union", "College", "University" or "Brand". */
  typeLabel: string
  city: string | null
  country: string | null
}

export type OrganisationPageData = {
  id: string
  type: OrgTypeKey
  slug: string
  name: string
  typeLabel: string
  descriptionHtml: string
  descriptionText: string
  logoFileId: string | null
  officialEmail: string | null
  officialPhone: string | null
  website: string | null
  foundedYear: number | null
  address: { line1: string | null; line2: string | null; city: string | null; region: string | null; postcode: string | null; country: string | null }
  mapAddress: string | null
  placeId: string | null
  social: { label: string; url: string }[]
  trainingGround: { text: string; placeId: string | null } | null
  playingGround: { text: string; placeId: string | null } | null
  previousResults: string | null
  level: string | null
  institutionKind: 'COLLEGE' | 'UNIVERSITY' | null
  industry: string | null
  leagues: string[]
  coaches: { id: string; name: string; jobRole: string; photoFileId: string | null; startDate: Date; endDate: Date | null }[]
  seasons: { id: string; label: string; startDate: Date; endDate: Date }[]
  trainingSessions: { id: string; day: string; startTime: string; endTime: string }[]
  pathways: { id: string; text: string; href: string | null }[]
}

export type OrganisationPickerOption = { id: string; name: string; city: string | null }
