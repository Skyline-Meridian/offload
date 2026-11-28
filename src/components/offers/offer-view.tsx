import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { MapEmbed } from '@/components/shared/map-embed'
import { OrganisationLogo } from '@/components/shared/organisation-logo'
import { ORG_TYPE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/format/date'
import { routes } from '@/lib/routes'
import type { OfferPageData } from '@/lib/view-models/offers'

export function OfferView({ offer, apply }: { offer: OfferPageData; apply: React.ReactNode }): React.JSX.Element {
  return (
    <article className="flex flex-col gap-lg">
      <header className="flex flex-col gap-xs">
        <h1 className="text-h2">{offer.title}</h1>
        <Link href={routes.orgPage(offer.offeredBy, offer.organisationSlug)} className="flex items-center gap-sm hover:no-underline">
          <OrganisationLogo fileId={offer.organisationLogoFileId} name={offer.organisationName} variant="avatar" />
          <span className="text-h4">{offer.organisationName}</span>
        </Link>
        <div className="flex flex-wrap gap-2xs">
          <Badge>{ORG_TYPE_LABELS[offer.offeredBy]}</Badge>
          {offer.paid ? <Badge variant={offer.paid === 'PAID' ? 'success' : 'neutral'}>{offer.paid === 'PAID' ? 'Paid' : 'Unpaid'}</Badge> : null}
          {offer.status !== 'PUBLISHED' ? <Badge variant="warning">{offer.status.toLowerCase()}</Badge> : null}
        </div>
        {offer.expiresAt ? <p className="text-hint">Closes {formatDate(offer.expiresAt)}</p> : null}
      </header>
      {apply}
      <section className="flex flex-col gap-xs">
        <h2 className="text-h3">About the offer</h2>
        {/* Stored HTML was cleaned by sanitize-html when the offer was saved. */}
        <div className="rich-text text-body" dangerouslySetInnerHTML={{ __html: offer.descriptionHtml }} />
      </section>
      {offer.positions.length > 0 ? (
        <section className="flex flex-col gap-xs">
          <h2 className="text-h3">Positions</h2>
          <p className="text-body">{offer.positions.join(', ')}</p>
        </section>
      ) : null}
      {offer.skills.length > 0 ? (
        <section className="flex flex-col gap-xs">
          <h2 className="text-h3">Skills</h2>
          <p className="text-body">{offer.skills.join(', ')}</p>
        </section>
      ) : null}
      {offer.locationText ? (
        <section className="flex flex-col gap-xs">
          <h2 className="text-h3">Location</h2>
          {offer.locationPlaceId ? <MapEmbed placeId={offer.locationPlaceId} address={offer.locationText} title="Offer location" /> : <p className="text-body">{offer.locationText}</p>}
        </section>
      ) : null}
    </article>
  )
}
