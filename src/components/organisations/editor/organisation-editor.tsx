import { DetailsSection } from '@/components/organisations/editor/details-section'
import { CoachesSection, PathwaysSection, SeasonsSection, TrainingSection } from '@/components/organisations/editor/list-sections'
import { StatusPanel } from '@/components/organisations/editor/status-panel'
import type { OrganisationEditorData, OrganisationEditorReference } from '@/components/organisations/editor/types'

export function OrganisationEditor({ data, reference }: { data: OrganisationEditorData; reference: OrganisationEditorReference }): React.JSX.Element {
  const sports = data.type !== 'BRAND'
  return (
    <div className="flex flex-col gap-lg">
      <StatusPanel data={data} />
      <DetailsSection data={data} reference={reference} />
      {sports ? <CoachesSection items={data.coaches} /> : null}
      {sports ? <SeasonsSection items={data.seasons} /> : null}
      {sports ? <TrainingSection items={data.sessions} /> : null}
      {data.type === 'CLUB' ? <PathwaysSection items={data.pathways} /> : null}
    </div>
  )
}
