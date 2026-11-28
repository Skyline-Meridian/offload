/** The facts the completeness percentage needs. Built from the player's own profile (PLR-8). */
export type CompletenessInput = {
  hasPicture: boolean
  hasBio: boolean
  hasNationalities: boolean
  positionCount: number
  hasHeight: boolean
  hasWeight: boolean
  hasCurrentClub: boolean
  hasContractEnd: boolean
  hasRugbyCode: boolean
  qualificationCount: number
  hasHighestQualification: boolean
  hasStrengths: boolean
  hasWorkOns: boolean
  hasColourPersonality: boolean
  softSkillCount: number
  gameSkillCount: number
  eligibleCountryCount: number
  conditioningCount: number
  academicAnswered: boolean
  clubHistoryCount: number
  achievementCount: number
  hasHighlightVideo: boolean
  featuredVideoCount: number
  hasCv: boolean
  socialCount: number
  isCapped: boolean
  cappedCountryCount: number
  ageGroupCount: number
  hasFirstCap: boolean
  hasLastCap: boolean
  hasTotalCaps: boolean
}

export type CompletenessResult = { percent: number; filled: number; total: number }

export function profileCompleteness(i: CompletenessInput): CompletenessResult {
  const checks: boolean[] = [
    i.hasPicture,
    i.hasBio,
    i.hasNationalities,
    i.positionCount >= 1,
    i.positionCount >= 2,
    i.positionCount >= 3,
    i.hasHeight,
    i.hasWeight,
    i.hasCurrentClub,
    i.hasContractEnd,
    i.hasRugbyCode,
    i.qualificationCount > 0,
    i.hasHighestQualification,
    i.hasStrengths,
    i.hasWorkOns,
    i.hasColourPersonality,
    i.softSkillCount > 0,
    i.gameSkillCount > 0,
    i.eligibleCountryCount > 0,
    // the six strength and conditioning tests count one by one
    ...Array.from({ length: 6 }, (_, n) => i.conditioningCount > n),
    i.academicAnswered,
    i.clubHistoryCount > 0,
    i.achievementCount > 0,
    i.hasHighlightVideo,
    i.featuredVideoCount > 0,
    i.hasCv,
    i.socialCount > 0,
  ]
  if (i.isCapped) {
    checks.push(i.cappedCountryCount > 0, i.ageGroupCount > 0, i.hasFirstCap, i.hasLastCap, i.hasTotalCaps)
  }
  const filled = checks.filter(Boolean).length
  return { percent: Math.round((filled / checks.length) * 100), filled, total: checks.length }
}
