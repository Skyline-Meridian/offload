import type { EditorData } from '@/components/players/editor/types'
import { toDateInputValue } from '@/lib/format/date'

/** The shape of the player's own profile as the DAL returns it, limited to what the editor needs. */
type Own = {
  user: {
    firstName: string | null
    lastName: string | null
    dateOfBirth: Date | null
    nationalities: string[]
    personalPhone: string | null
    bio: string | null
    profilePictureId: string | null
    documentStatus: string
    isEmailVerified: boolean
  }
  primaryPositionId: string | null
  secondaryPositionId: string | null
  otherPositionId: string | null
  heightCm: number | null
  weightKg: number | null
  currentClubId: string | null
  currentClubText: string | null
  currentUnionId: string | null
  currentUnionText: string | null
  currentInstitutionId: string | null
  currentInstitutionText: string | null
  currentClub: { name: string } | null
  currentUnion: { name: string } | null
  currentInstitution: { name: string } | null
  contractEndDate: Date | null
  rugbyCode: string | null
  highestQualification: string | null
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
  maxSpeedMs: { toString(): string } | null
  broadJumpCm: { toString(): string } | null
  test1200Sec: { toString(): string } | null
  cmjCm: { toString(): string } | null
  bench1rmKg: { toString(): string } | null
  squat1rmKg: { toString(): string } | null
  hasAcademicInterest: boolean
  isGraduated: boolean
  highlightVideoUrl: string | null
  cvFileId: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  linkedinUrl: string | null
  facebookUrl: string | null
  xUrl: string | null
  countries: { country: string; kind: 'ELIGIBLE' | 'CAPPED' }[]
  ageGroups: { ageGroup: string }[]
  qualifications: { qualificationId: string }[]
  skills: { skillId: string }[]
  clubHistory: { id: string; clubName: string; startDate: Date | null; endDate: Date | null; coaches: string | null }[]
  achievements: { id: string; title: string; year: number | null }[]
  featuredVideos: { id: string; youtubeUrl: string; howToIdentify: string | null }[]
}

const text = (v: string | null | undefined): string => v ?? ''
const num = (v: { toString(): string } | number | null | undefined): string => (v === null || v === undefined ? '' : v.toString())

/** Turns the database shape into plain strings and booleans for the editor forms. */
export function toEditorData(p: Own): EditorData {
  const sortedHistory = [...p.clubHistory].sort((a, b) => {
    const ae = a.endDate?.getTime() ?? Number.POSITIVE_INFINITY
    const be = b.endDate?.getTime() ?? Number.POSITIVE_INFINITY
    return ae !== be ? be - ae : (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0)
  })
  return {
    identity: {
      firstName: text(p.user.firstName),
      lastName: text(p.user.lastName),
      dateOfBirth: toDateInputValue(p.user.dateOfBirth),
      nationalities: p.user.nationalities,
      personalPhone: text(p.user.personalPhone),
      bio: text(p.user.bio),
      profilePictureId: text(p.user.profilePictureId),
    },
    playing: {
      primaryPositionId: text(p.primaryPositionId),
      secondaryPositionId: text(p.secondaryPositionId),
      otherPositionId: text(p.otherPositionId),
      heightCm: num(p.heightCm),
      weightKg: num(p.weightKg),
      currentClubId: text(p.currentClubId),
      currentClubText: text(p.currentClubText),
      currentUnionId: text(p.currentUnionId),
      currentUnionText: text(p.currentUnionText),
      currentInstitutionId: text(p.currentInstitutionId),
      currentInstitutionText: text(p.currentInstitutionText),
      currentClubName: text(p.currentClub?.name),
      currentUnionName: text(p.currentUnion?.name),
      currentInstitutionName: text(p.currentInstitution?.name),
      contractEndDate: toDateInputValue(p.contractEndDate),
      rugbyCode: text(p.rugbyCode),
      qualificationIds: p.qualifications.map((q) => q.qualificationId),
      highestQualification: text(p.highestQualification),
      isKeenToRelocate: p.isKeenToRelocate,
      isRetired: p.isRetired,
      isOpenToBrandPartnership: p.isOpenToBrandPartnership,
      strengths: text(p.strengths),
      workOns: text(p.workOns),
      colourPersonality: text(p.colourPersonality),
      skillIds: p.skills.map((s) => s.skillId),
    },
    eligibility: {
      eligibleCountries: p.countries.filter((c) => c.kind === 'ELIGIBLE').map((c) => c.country),
      isCapped: p.isCapped,
      cappedCountries: p.countries.filter((c) => c.kind === 'CAPPED').map((c) => c.country),
      ageGroups: p.ageGroups.map((a) => a.ageGroup),
      firstCap: toDateInputValue(p.firstCap),
      lastCap: toDateInputValue(p.lastCap),
      totalCaps: num(p.totalCaps),
    },
    conditioning: {
      maxSpeedMs: num(p.maxSpeedMs),
      broadJumpCm: num(p.broadJumpCm),
      test1200Sec: num(p.test1200Sec),
      cmjCm: num(p.cmjCm),
      bench1rmKg: num(p.bench1rmKg),
      squat1rmKg: num(p.squat1rmKg),
    },
    academic: { hasAcademicInterest: p.hasAcademicInterest, isGraduated: p.isGraduated },
    clubHistory: sortedHistory.map((h) => ({
      id: h.id,
      clubName: h.clubName,
      startDate: toDateInputValue(h.startDate),
      endDate: toDateInputValue(h.endDate),
      coaches: text(h.coaches),
    })),
    achievements: [...p.achievements]
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title))
      .map((a) => ({ id: a.id, title: a.title, year: num(a.year) })),
    highlightVideoUrl: text(p.highlightVideoUrl),
    featuredVideos: p.featuredVideos.map((v) => ({ id: v.id, youtubeUrl: v.youtubeUrl, howToIdentify: text(v.howToIdentify) })),
    social: {
      instagramUrl: text(p.instagramUrl),
      youtubeUrl: text(p.youtubeUrl),
      linkedinUrl: text(p.linkedinUrl),
      facebookUrl: text(p.facebookUrl),
      xUrl: text(p.xUrl),
    },
    cvFileId: text(p.cvFileId),
    documentStatus: p.user.documentStatus,
    isEmailVerified: p.user.isEmailVerified,
  }
}
