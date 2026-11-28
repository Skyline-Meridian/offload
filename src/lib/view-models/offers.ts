import type { OrgTypeKey } from '@/lib/constants'

export type OfferCardData = {
  id: string
  title: string
  organisationName: string
  organisationLogoFileId: string | null
  offeredBy: OrgTypeKey
  paid: 'PAID' | 'UNPAID' | null
  positions: string[]
  locationText: string | null
  publishedAt: Date | null
  expiresAt: Date | null
}

export type OfferPageData = OfferCardData & {
  organisationId: string
  organisationSlug: string
  descriptionHtml: string
  skills: string[]
  locationPlaceId: string | null
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'CLOSED' | 'EXPIRED'
}

export type ManagerOfferRow = {
  id: string
  title: string
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'CLOSED' | 'EXPIRED'
  publishedAt: Date | null
  expiresAt: Date | null
  applicationCount: number
  closedByStaff: boolean
  closedReason: string | null
  canCopy: boolean
}

export type OfferEditorData = {
  id: string
  status: string
  title: string
  description: string
  paid: string
  positionIds: string[]
  skillIds: string[]
  locationText: string
  locationPlaceId: string
}

export type ManagerApplicationRow = {
  id: string
  status: 'SUBMITTED' | 'SHORTLISTED' | 'CONTACTED' | 'REJECTED' | 'WITHDRAWN'
  note: string | null
  createdAt: Date
  offerId: string
  offerTitle: string
  playerId: string
  playerName: string
  pictureFileId: string | null
  primaryPosition: string | null
  clubName: string | null
}

export type PlayerApplicationRow = {
  id: string
  status: 'SUBMITTED' | 'SHORTLISTED' | 'CONTACTED' | 'REJECTED' | 'WITHDRAWN'
  createdAt: Date
  offerId: string
  offerTitle: string
  organisationName: string
  offerIsOpen: boolean
}
