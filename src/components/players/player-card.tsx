import Image from 'next/image'
import Link from 'next/link'

import { PlayerBadges } from '@/components/players/badges'
import { PlaceholderImage } from '@/components/ui/placeholder-image'
import { routes } from '@/lib/routes'
import type { PlayerCardData } from '@/lib/view-models/players'

const MAX_COUNTRIES = 3

export function PlayerCard({ player }: { player: PlayerCardData }): React.JSX.Element {
  const extra = player.eligibleCountries.length - MAX_COUNTRIES
  return (
    <li className="bg-white border-thin border-border flex flex-col">
      <Link href={routes.player(player.id)} className="flex flex-1 flex-col hover:no-underline">
        <span className="relative block aspect-square bg-surface">
          {player.pictureFileId ? (
            <Image src={routes.media(player.pictureFileId, 'card')} alt="" fill unoptimized sizes="(min-width: 1025px) 25vw, 50vw" className="object-cover" />
          ) : (
            <PlaceholderImage />
          )}
        </span>
        <span className="flex flex-col gap-2xs p-sm">
          <span className="text-h4">{player.name}</span>
          {player.primaryPosition ? <span className="text-eyebrow">{player.primaryPosition}</span> : null}
          {player.clubName ? <span className="text-body">{player.clubName}</span> : null}
          <span className="text-hint">
            {[player.heightCm ? `${player.heightCm} cm` : null, player.weightKg ? `${player.weightKg} kg` : null].filter(Boolean).join(' · ')}
          </span>
          {player.eligibleCountries.length > 0 ? (
            <span className="text-hint">
              {player.eligibleCountries.slice(0, MAX_COUNTRIES).join(', ')}
              {extra > 0 ? ` +${extra}` : ''}
            </span>
          ) : null}
          <PlayerBadges
            hasEqp={player.hasEqp}
            hasJiff={player.hasJiff}
            isContractEndingSoon={player.isContractEndingSoon}
            isRetired={player.isRetired}
          />
        </span>
      </Link>
    </li>
  )
}
