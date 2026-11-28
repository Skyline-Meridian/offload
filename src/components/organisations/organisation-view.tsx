import Link from 'next/link'

import { MapEmbed } from '@/components/shared/map-embed'
import { OrganisationLogo } from '@/components/shared/organisation-logo'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/format/date'
import type { OrganisationPageData } from '@/lib/view-models/organisations'

const dayLabels: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' }

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-xs">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  )
}

type Props = {
  org: OrganisationPageData
  countryNames: Record<string, string>
  /** Per-viewer pieces (message button, players, offers) are passed in as slots. */
  actions?: React.ReactNode
  offers?: React.ReactNode
  players?: React.ReactNode
}

/** The public organisation page. Everything here comes from the cached public data. */
export function OrganisationView({ org, countryNames, actions, offers, players }: Props): React.JSX.Element {
  const addressText = [org.address.line1, org.address.line2, org.address.city, org.address.region, org.address.postcode, org.address.country ? countryNames[org.address.country] : null]
    .filter(Boolean)
    .join(', ')
  return (
    <div className="flex flex-col gap-xl">
      <header className="flex flex-col items-start gap-md md:flex-row md:items-center">
        <OrganisationLogo fileId={org.logoFileId} name={org.name} className="size-avatar-xl" />
        <div className="flex flex-col gap-xs">
          <p className="text-eyebrow">{org.typeLabel}</p>
          <h1 className="text-h2">{org.name}</h1>
          {org.address.city || org.address.country ? (
            <p className="text-body">{[org.address.city, org.address.country ? countryNames[org.address.country] : null].filter(Boolean).join(', ')}</p>
          ) : null}
          {actions}
        </div>
      </header>

      {org.descriptionHtml ? (
        <Section title="About">
          {/* The only place stored HTML is rendered: it was cleaned by sanitize-html when it was saved. */}
          <div className="rich-text text-body" dangerouslySetInnerHTML={{ __html: org.descriptionHtml }} />
        </Section>
      ) : null}

      <Section title="Details">
        <dl className="grid gap-xs md:grid-cols-2">
          {(
            [
              ['Founded', org.foundedYear?.toString()],
              ['Level', org.level],
              ['Industry', org.industry],
              ['Leagues', org.leagues.join(', ')],
              ['Website', org.website],
              ['Email', org.officialEmail],
              ['Phone', org.officialPhone],
            ] as [string, string | null | undefined][]
          )
            .filter(([, v]) => Boolean(v))
            .map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-hint">{label}</dt>
                <dd className="text-body">
                  {label === 'Website' && value ? (
                    <a href={value} className="text-link" rel="noopener noreferrer" target="_blank">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
        </dl>
      </Section>

      {org.placeId && org.mapAddress ? (
        <Section title="Location">
          <MapEmbed placeId={org.placeId} address={org.mapAddress} title={`Map of ${org.name}`} />
        </Section>
      ) : addressText ? (
        <Section title="Location">
          <p className="text-body">{addressText}</p>
        </Section>
      ) : null}

      {org.trainingGround || org.playingGround ? (
        <Section title="Grounds">
          {org.trainingGround ? (
            org.trainingGround.placeId ? (
              <MapEmbed placeId={org.trainingGround.placeId} address={`Training: ${org.trainingGround.text}`} title="Training ground map" />
            ) : (
              <p className="text-body">Training: {org.trainingGround.text}</p>
            )
          ) : null}
          {org.playingGround ? (
            org.playingGround.placeId ? (
              <MapEmbed placeId={org.playingGround.placeId} address={`Playing: ${org.playingGround.text}`} title="Playing ground map" />
            ) : (
              <p className="text-body">Playing: {org.playingGround.text}</p>
            )
          ) : null}
        </Section>
      ) : null}

      {org.trainingSessions.length > 0 ? (
        <Section title="Training days">
          <ul className="text-body">
            {org.trainingSessions.map((s) => (
              <li key={s.id}>
                {dayLabels[s.day] ?? s.day}: {s.startTime} to {s.endTime}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {org.coaches.length > 0 ? (
        <Section title="Coaches">
          <ul className="grid gap-md md:grid-cols-3">
            {org.coaches.map((c) => (
              <li key={c.id}>
                <Card>
                  <p className="text-h5">{c.name}</p>
                  <p className="text-body">{c.jobRole}</p>
                  <p className="text-hint">
                    {formatDate(c.startDate)} to {c.endDate ? formatDate(c.endDate) : 'present'}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {org.seasons.length > 0 ? (
        <Section title="Seasons">
          <ul className="text-body">
            {org.seasons.map((s) => (
              <li key={s.id}>
                {s.label} ({formatDate(s.startDate)} to {formatDate(s.endDate)})
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {org.previousResults ? (
        <Section title="Previous results">
          <p className="text-body whitespace-pre-line">{org.previousResults}</p>
        </Section>
      ) : null}

      {org.pathways.length > 0 ? (
        <Section title="College and university pathways">
          <ul className="text-body">
            {org.pathways.map((p) => (
              <li key={p.id}>
                {p.href ? (
                  <Link href={p.href} className="text-link">
                    {p.text}
                  </Link>
                ) : (
                  p.text
                )}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {offers}
      {players}

      {org.social.length > 0 ? (
        <Section title="Social">
          <ul className="flex flex-wrap gap-md">
            {org.social.map((s) => (
              <li key={s.label}>
                <a href={s.url} className="text-link" rel="noopener noreferrer" target="_blank">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
