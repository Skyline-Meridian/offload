import { Card } from '@/components/ui/card'

export function SectionCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Card as="section" className="gap-md">
      <h2 id={id} className="text-h3">
        {title}
      </h2>
      {children}
    </Card>
  )
}
