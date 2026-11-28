'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { acceptedCategory } from 'vanilla-cookieconsent'

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY

type Props = { placeId: string; address: string; title: string }

/** Shows the address, and the Google map only after the visitor accepts the "maps" cookie category. */
export function MapEmbed({ placeId, address, title }: Props): React.JSX.Element {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    const check = (): void => setAllowed(acceptedCategory('maps'))
    check()
    window.addEventListener('cc:onConsent', check)
    window.addEventListener('cc:onChange', check)
    return () => {
      window.removeEventListener('cc:onConsent', check)
      window.removeEventListener('cc:onChange', check)
    }
  }, [])
  const [forced, setForced] = useState(false)

  return (
    <div className="flex flex-col gap-xs">
      <p className="text-body flex items-start gap-2xs">
        <Icon icon={MapPin} size="sm" className="mt-2xs" />
        {address}
      </p>
      {key && (allowed || forced) ? (
        <iframe
          title={title}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=place_id:${encodeURIComponent(placeId)}`}
          className="aspect-video w-full border-0"
        />
      ) : key ? (
        <Button variant="ghost" size="sm" className="self-start" onPress={() => setForced(true)}>
          Show map
        </Button>
      ) : null}
    </div>
  )
}
