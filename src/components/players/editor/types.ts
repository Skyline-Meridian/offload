import type { SelectOption } from '@/components/ui/select'

/** Display shapes for the profile editor. Dates are YYYY-MM-DD strings so they can cross to client components. */
export type EditorData = {
  identity: {
    firstName: string
    lastName: string
    dateOfBirth: string
    nationalities: string[]
    personalPhone: string
    bio: string
    profilePictureId: string
  }
  playing: {
    primaryPositionId: string
    secondaryPositionId: string
    otherPositionId: string
    heightCm: string
    weightKg: string
    currentClubId: string
    currentClubText: string
    currentUnionId: string
    currentUnionText: string
    currentInstitutionId: string
    currentInstitutionText: string
    contractEndDate: string
    rugbyCode: string
    qualificationIds: string[]
    highestQualification: string
    isKeenToRelocate: boolean
    isRetired: boolean
    isOpenToBrandPartnership: boolean
    strengths: string
    workOns: string
    colourPersonality: string
    skillIds: string[]
    /** Names of the linked organisations, for display. */
    currentClubName: string
    currentUnionName: string
    currentInstitutionName: string
  }
  eligibility: {
    eligibleCountries: string[]
    isCapped: boolean
    cappedCountries: string[]
    ageGroups: string[]
    firstCap: string
    lastCap: string
    totalCaps: string
  }
  conditioning: Record<'maxSpeedMs' | 'broadJumpCm' | 'test1200Sec' | 'cmjCm' | 'bench1rmKg' | 'squat1rmKg', string>
  academic: { hasAcademicInterest: boolean; isGraduated: boolean }
  clubHistory: { id: string; clubName: string; startDate: string; endDate: string; coaches: string }[]
  achievements: { id: string; title: string; year: string }[]
  highlightVideoUrl: string
  featuredVideos: { id: string; youtubeUrl: string; howToIdentify: string }[]
  social: Record<'instagramUrl' | 'youtubeUrl' | 'linkedinUrl' | 'facebookUrl' | 'xUrl', string>
  cvFileId: string
  documentStatus: string
  isEmailVerified: boolean
}

export type EditorReference = {
  positions: SelectOption[]
  skills: { value: string; label: string; kind: 'SOFT' | 'GAME' }[]
  qualifications: SelectOption[]
  countries: SelectOption[]
}
