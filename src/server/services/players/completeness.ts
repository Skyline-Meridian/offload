import 'server-only'

import { profileCompleteness, type CompletenessResult } from '@/lib/profile-completeness'
import type { OwnPlayerProfile } from '@/server/dal/players'
import { db } from '@/server/db'

/** Completeness of a player's own profile. `academicAnswered` is true once the player has saved the academic section. */
export async function completenessFor(profile: OwnPlayerProfile): Promise<CompletenessResult> {
  const skills = await db.skill.findMany({
    where: { id: { in: profile.skills.map((s) => s.skillId) } },
    select: { kind: true },
  })
  const conditioning = [
    profile.maxSpeedMs,
    profile.broadJumpCm,
    profile.test1200Sec,
    profile.cmjCm,
    profile.bench1rmKg,
    profile.squat1rmKg,
  ].filter((v) => v !== null).length
  const positions = [profile.primaryPositionId, profile.secondaryPositionId, profile.otherPositionId].filter(Boolean).length
  const socials = [profile.instagramUrl, profile.youtubeUrl, profile.linkedinUrl, profile.facebookUrl, profile.xUrl].filter(Boolean).length

  return profileCompleteness({
    hasPicture: Boolean(profile.user.profilePictureId),
    hasBio: Boolean(profile.user.bio),
    hasNationalities: profile.user.nationalities.length > 0,
    positionCount: positions,
    hasHeight: profile.heightCm !== null,
    hasWeight: profile.weightKg !== null,
    hasCurrentClub: Boolean(profile.currentClubId ?? profile.currentClubText),
    hasContractEnd: profile.contractEndDate !== null,
    hasRugbyCode: profile.rugbyCode !== null,
    qualificationCount: profile.qualifications.length,
    hasHighestQualification: Boolean(profile.highestQualification),
    hasStrengths: Boolean(profile.strengths),
    hasWorkOns: Boolean(profile.workOns),
    hasColourPersonality: Boolean(profile.colourPersonality),
    softSkillCount: skills.filter((s) => s.kind === 'SOFT').length,
    gameSkillCount: skills.filter((s) => s.kind === 'GAME').length,
    eligibleCountryCount: profile.countries.filter((c) => c.kind === 'ELIGIBLE').length,
    conditioningCount: conditioning,
    academicAnswered: profile.hasAcademicInterest || profile.isGraduated,
    clubHistoryCount: profile.clubHistory.length,
    achievementCount: profile.achievements.length,
    hasHighlightVideo: Boolean(profile.highlightVideoUrl),
    featuredVideoCount: profile.featuredVideos.length,
    hasCv: Boolean(profile.cvFileId),
    socialCount: socials,
    isCapped: profile.isCapped,
    cappedCountryCount: profile.countries.filter((c) => c.kind === 'CAPPED').length,
    ageGroupCount: profile.ageGroups.length,
    hasFirstCap: profile.firstCap !== null,
    hasLastCap: profile.lastCap !== null,
    hasTotalCaps: profile.totalCaps !== null,
  })
}
