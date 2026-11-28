import { AcademicSection, ConditioningSection, EligibilitySection } from '@/components/players/editor/eligibility-section'
import { DocumentsSection, SocialSection } from '@/components/players/editor/documents-section'
import { IdentitySection } from '@/components/players/editor/identity-section'
import { AchievementsSection, ClubHistorySection, VideosSection } from '@/components/players/editor/list-sections'
import { PlayingSection } from '@/components/players/editor/playing-section'
import type { EditorData, EditorReference } from '@/components/players/editor/types'

/** The whole player profile editor: one section per form. */
export function PlayerEditor({ data, reference }: { data: EditorData; reference: EditorReference }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-lg">
      <IdentitySection data={data.identity} reference={reference} />
      <PlayingSection data={data.playing} reference={reference} />
      <EligibilitySection data={data.eligibility} reference={reference} />
      <ConditioningSection data={data.conditioning} />
      <AcademicSection data={data.academic} />
      <ClubHistorySection entries={data.clubHistory} />
      <AchievementsSection entries={data.achievements} />
      <VideosSection highlightVideoUrl={data.highlightVideoUrl} featured={data.featuredVideos} />
      <SocialSection data={data.social} />
      <DocumentsSection cvFileId={data.cvFileId} documentStatus={data.documentStatus} isEmailVerified={data.isEmailVerified} />
    </div>
  )
}
