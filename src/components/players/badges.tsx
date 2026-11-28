import { Badge } from '@/components/ui/badge'

type Props = {
  hasEqp?: boolean
  hasJiff?: boolean
  isContractEndingSoon?: boolean
  isRetired?: boolean
}

/** Qualification, contract and retirement badges, shared by the card and the profile page. */
export function PlayerBadges({ hasEqp, hasJiff, isContractEndingSoon, isRetired }: Props): React.JSX.Element | null {
  if (!hasEqp && !hasJiff && !isContractEndingSoon && !isRetired) return null
  return (
    <ul className="flex flex-wrap gap-2xs">
      {hasEqp ? (
        <li>
          <Badge variant="accent">EQP</Badge>
        </li>
      ) : null}
      {hasJiff ? (
        <li>
          <Badge variant="accent">JIFF</Badge>
        </li>
      ) : null}
      {isContractEndingSoon ? (
        <li>
          <Badge variant="warning">Contract ending soon</Badge>
        </li>
      ) : null}
      {isRetired ? (
        <li>
          <Badge>Retired</Badge>
        </li>
      ) : null}
    </ul>
  )
}
