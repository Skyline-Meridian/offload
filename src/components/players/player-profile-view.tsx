import Image from 'next/image'
import Link from 'next/link'

import { PlayerBadges } from '@/components/players/badges'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { PlaceholderImage } from '@/components/ui/placeholder-image'
import { formatDate, formatMonthYear } from '@/lib/format/date'
import { embedUrl, parseVideoUrl } from '@/lib/format/video'
import { routes } from '@/lib/routes'
import type { PlayerProfileData as ProfileData } from '@/lib/view-models/players'

type Props = {
  profile: ProfileData
  canMessage: boolean
  canViewCv: boolean
  /** Country names by code, so the page shows names. */
  countryNames: Record<string, string>
  isOwn: boolean
}

const notProvided = 'Details not provided'

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-xs">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  )
}

function Facts({ items }: { items: [string, React.ReactNode][] }): React.JSX.Element {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (shown.length === 0) return <p className="text-body">{notProvided}</p>
  return (
    <dl className="grid gap-xs md:grid-cols-2">
      {shown.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-hint">{label}</dt>
          <dd className="text-body">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Video({ url, title }: { url: string; title: string }): React.JSX.Element | null {
  const parsed = parseVideoUrl(url)
  if (!parsed) return null
  return (
    <div className="relative aspect-video w-full">
      <iframe
        src={embedUrl(parsed)}
        title={title}
        loading="lazy"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 size-full"
      />
    </div>
  )
}

export function PlayerProfileView({ profile, canMessage, canViewCv, countryNames, isOwn }: Props): React.JSX.Element {
  const country = (code: string): string => countryNames[code] ?? code
  const club = profile.currentClub
    ? profile.currentClub.name
    : (profile.currentClubText ?? null)
  const positions = [profile.primaryPosition, profile.secondaryPosition, profile.otherPosition].filter(Boolean).map((p) => p!.label)
  const eligible = profile.countries.filter((c) => c.kind === 'ELIGIBLE').map((c) => country(c.country))
  const capped = profile.countries.filter((c) => c.kind === 'CAPPED').map((c) => country(c.country))
  const soft = profile.skills.filter((s) => s.skill.kind === 'SOFT').map((s) => s.skill.label)
  const game = profile.skills.filter((s) => s.skill.kind === 'GAME').map((s) => s.skill.label)
  const socials = [
    ['Instagram', profile.instagramUrl],
    ['YouTube', profile.youtubeUrl],
    ['LinkedIn', profile.linkedinUrl],
    ['Facebook', profile.facebookUrl],
    ['X', profile.xUrl],
  ].filter((s): s is [string, string] => Boolean(s[1]))

  return (
    <div className="flex flex-col gap-xl">
      <header className="grid items-start gap-lg md:grid-cols-3">
        <div className="relative size-avatar-xl overflow-hidden bg-surface">
          {profile.pictureFileId ? (
            <Image src={routes.media(profile.pictureFileId, 'header')} alt={profile.name} fill unoptimized className="object-cover" />
          ) : (
            <PlaceholderImage />
          )}
        </div>
        <div className="flex flex-col gap-xs md:col-span-2">
          <h1 className="text-h2">{profile.name}</h1>
          {profile.primaryPosition ? <p className="text-eyebrow">{profile.primaryPosition.label}</p> : null}
          <p className="text-body">
            {[profile.nationalities.map(country).join(', '), profile.age !== null ? `${profile.age} years old` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {club ? <p className="text-body">{club}</p> : null}
          <PlayerBadges isContractEndingSoon={profile.isContractEndingSoon} isRetired={profile.isRetired} hasEqp={profile.qualifications.some((q) => q.qualification.id === 'eqp')} hasJiff={profile.qualifications.some((q) => q.qualification.id === 'jiff')} />
          <div className="flex flex-wrap gap-sm pt-xs">
            {canMessage ? <LinkButton href={`${routes.messages}?to=${profile.userId}`}>Message</LinkButton> : null}
            {isOwn ? (
              <LinkButton href={`${routes.dashboard}/profile`} variant="ghost">
                Edit my profile
              </LinkButton>
            ) : null}
          </div>
        </div>
      </header>

      <Section title="Biography">
        <p className="text-body whitespace-pre-line">{profile.bio ?? notProvided}</p>
      </Section>

      <Section title="Playing details">
        <Facts
          items={[
            ['Positions', positions.join(', ')],
            ['Height', profile.heightCm ? `${profile.heightCm} cm` : null],
            ['Weight', profile.weightKg ? `${profile.weightKg} kg` : null],
            ['Current club', club],
            ['Current union', profile.currentUnion?.name ?? profile.currentUnionText],
            ['Current college or university', profile.currentInstitution?.name ?? profile.currentInstitutionText],
            ['Contract ends', profile.contractEndDate ? formatDate(profile.contractEndDate) : null],
            ['Code', profile.rugbyCode ? { LEAGUE_ONLY: 'League', UNION_ONLY: 'Union', BOTH: 'League and union' }[profile.rugbyCode] : null],
            ['Keen to relocate', profile.isKeenToRelocate ? 'Yes' : null],
            ['Open to brand partnerships', profile.isOpenToBrandPartnership ? 'Yes' : null],
            ['Strengths', profile.strengths],
            ['Areas to work on', profile.workOns],
            ['Colour personality', profile.colourPersonality],
          ]}
        />
      </Section>

      <Section title="Strength and conditioning">
        <Facts
          items={[
            ['Max speed', profile.maxSpeedMs ? `${profile.maxSpeedMs} m/s` : null],
            ['Broad jump', profile.broadJumpCm ? `${profile.broadJumpCm} cm` : null],
            ['1200 m', profile.test1200Sec ? `${profile.test1200Sec} s` : null],
            ['CMJ', profile.cmjCm ? `${profile.cmjCm} cm` : null],
            ['Bench press 1RM', profile.bench1rmKg ? `${profile.bench1rmKg} kg` : null],
            ['Squat 1RM', profile.squat1rmKg ? `${profile.squat1rmKg} kg` : null],
          ]}
        />
      </Section>

      <Section title="Eligibility and caps">
        <Facts
          items={[
            ['Eligible to play for', eligible.join(', ')],
            ['Capped', profile.isCapped ? 'Yes' : 'No'],
            ...(profile.isCapped
              ? ([
                ['Capped for', capped.join(', ')],
                ['Age groups', profile.ageGroups.map((a) => a.ageGroup).join(', ')],
                ['First cap', profile.firstCap ? formatDate(profile.firstCap) : null],
                ['Last cap', profile.lastCap ? formatDate(profile.lastCap) : null],
                ['Total caps', profile.totalCaps?.toString() ?? null],
              ] as [string, React.ReactNode][])
              : []),
          ]}
        />
      </Section>

      <Section title="Qualifications">
        <p className="text-body">{profile.qualifications.map((q) => q.qualification.label).join(', ') || notProvided}</p>
      </Section>

      <Section title="Club history">
        {profile.clubHistory.length === 0 ? (
          <p className="text-body">No club history added</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {profile.clubHistory.map((h) => (
              <li key={h.id}>
                <Card as="div">
                  <p className="text-h5">{h.clubName}</p>
                  <p className="text-hint">
                    {h.startDate ? formatMonthYear(h.startDate) : '?'} to {h.endDate ? formatMonthYear(h.endDate) : 'present'}
                  </p>
                  {h.coaches ? <p className="text-body">Coaches: {h.coaches}</p> : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Achievements">
        {profile.achievements.length === 0 ? (
          <p className="text-body">No achievements added</p>
        ) : (
          <ul className="text-body list-disc pl-md">
            {profile.achievements.map((a) => (
              <li key={a.id}>
                {a.title}
                {a.year ? ` (${a.year})` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Skills">
        <Facts items={[['Soft skills', soft.join(', ')], ['Game skills', game.join(', ')]]} />
      </Section>

      <Section title="Highlight video">
        {profile.highlightVideoUrl ? <Video url={profile.highlightVideoUrl} title={`${profile.name} highlight video`} /> : <p className="text-body">No highlight video added</p>}
      </Section>

      <Section title="Featured videos">
        {profile.featuredVideos.length === 0 ? (
          <p className="text-body">No featured videos added</p>
        ) : (
          <ul className="grid gap-md md:grid-cols-2">
            {profile.featuredVideos.map((v) => (
              <li key={v.id} className="flex flex-col gap-2xs">
                <Video url={v.youtubeUrl} title={`${profile.name} featured video`} />
                {v.howToIdentify ? <p className="text-hint">How to identify me: {v.howToIdentify}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {profile.cvFileId && canViewCv ? (
        <Section title="CV">
          <Link href={routes.file(profile.cvFileId)} className="text-link" target="_blank">
            Download CV
          </Link>
        </Section>
      ) : null}

      {socials.length > 0 ? (
        <Section title="Social">
          <ul className="flex flex-wrap gap-md">
            {socials.map(([label, url]) => (
              <li key={label}>
                <a href={url} className="text-link" rel="noopener noreferrer" target="_blank">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  )
}
