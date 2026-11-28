/** Display shapes for players. Components use these; the DAL produces them. */

export type PlayerCardData = {
  id: string
  name: string
  pictureFileId: string | null
  primaryPosition: string | null
  clubName: string | null
  heightCm: number | null
  weightKg: number | null
  eligibleCountries: string[]
  hasEqp: boolean
  hasJiff: boolean
  isContractEndingSoon: boolean
  isRetired: boolean
}

type Numeric = { toString(): string }
type Named = { name: string; slug: string } | null
type Labelled = { label: string } | null

export type PlayerProfileData = {
  id: string
  userId: string
  name: string
  age: number | null
  bio: string | null
  pictureFileId: string | null
  nationalities: string[]
  isListed: boolean
  isContractEndingSoon: boolean
  heightCm: number | null
  weightKg: number | null
  contractEndDate: Date | null
  rugbyCode: 'LEAGUE_ONLY' | 'UNION_ONLY' | 'BOTH' | null
  isKeenToRelocate: boolean
  isRetired: boolean
  isOpenToBrandPartnership: boolean
  strengths: string | null
  workOns: string | null
  colourPersonality: string | null
  isCapped: boolean
  firstCap: Date | null
  lastCap: Date | null
  totalCaps: number | null
  maxSpeedMs: Numeric | null
  broadJumpCm: Numeric | null
  test1200Sec: Numeric | null
  cmjCm: Numeric | null
  bench1rmKg: Numeric | null
  squat1rmKg: Numeric | null
  highlightVideoUrl: string | null
  cvFileId: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  linkedinUrl: string | null
  facebookUrl: string | null
  xUrl: string | null
  currentClubText: string | null
  currentUnionText: string | null
  currentInstitutionText: string | null
  currentClub: Named
  currentUnion: Named
  currentInstitution: Named
  primaryPosition: Labelled
  secondaryPosition: Labelled
  otherPosition: Labelled
  countries: { country: string; kind: 'ELIGIBLE' | 'CAPPED' }[]
  ageGroups: { ageGroup: string }[]
  qualifications: { qualification: { id: string; label: string } }[]
  skills: { skill: { id: string; label: string; kind: 'SOFT' | 'GAME' } }[]
  clubHistory: { id: string; clubName: string; startDate: Date | null; endDate: Date | null; coaches: string | null }[]
  achievements: { id: string; title: string; year: number | null }[]
  featuredVideos: { id: string; youtubeUrl: string; howToIdentify: string | null }[]
}
