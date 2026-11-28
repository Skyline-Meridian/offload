import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { OrganisationLogo } from '@/components/shared/organisation-logo'
import { formatDate } from '@/lib/format/date'
import { routes } from '@/lib/routes'
import { ORG_TYPE_LABELS } from '@/lib/constants'
import type { OfferCardData } from '@/lib/view-models/offers'

export function OfferCard({ offer }: { offer: OfferCardData }): React.JSX.Element {
  return (
    <li className="bg-white border-thin border-border">
      <Link href={routes.offer(offer.id)} className="flex gap-sm p-sm hover:no-underline">
        <OrganisationLogo fileId={offer.organisationLogoFileId} name={offer.organisationName} variant="avatar" />
        <span className="flex flex-col gap-2xs">
          <span className="text-h4">{offer.title}</span>
          <span className="text-body">{offer.organisationName}</span>
          <span className="flex flex-wrap gap-2xs">
            <Badge>{ORG_TYPE_LABELS[offer.offeredBy]}</Badge>
            {offer.paid ? <Badge variant={offer.paid === 'PAID' ? 'success' : 'neutral'}>{offer.paid === 'PAID' ? 'Paid' : 'Unpaid'}</Badge> : null}
          </span>
          {offer.positions.length > 0 ? <span className="text-hint">{offer.positions.join(', ')}</span> : null}
          {offer.locationText ? <span className="text-hint">{offer.locationText}</span> : null}
          {offer.expiresAt ? <span className="text-hint">Closes {formatDate(offer.expiresAt)}</span> : null}
        </span>
      </Link>
    </li>
  )
}
