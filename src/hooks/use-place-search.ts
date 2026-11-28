'use client'

import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { useCallback, useEffect, useRef } from 'react'

const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY

export type PickedPlace = {
  placeId: string
  formattedAddress: string
  line1: string
  city: string
  region: string
  postcode: string
  country: string
}

let configured = false

function component(
  components: google.maps.places.AddressComponent[],
  type: string,
  short = false,
): string {
  const found = components.find((c) => c.types.includes(type))
  return (short ? found?.shortText : found?.longText) ?? ''
}

/**
 * Mounts Google's place search into a container the first time the field is used.
 * Without a browser key nothing is mounted and the field stays a plain text box.
 */
export function usePlaceSearch(onPick: (place: PickedPlace) => void): {
  mount: (container: HTMLElement | null) => void
  isAvailable: boolean
} {
  const mounted = useRef(false)
  const callback = useRef(onPick)
  useEffect(() => {
    callback.current = onPick
  })

  const mount = useCallback((container: HTMLElement | null) => {
    if (!container || mounted.current || !key) return
    mounted.current = true
    if (!configured) {
      setOptions({ key, v: 'weekly', language: 'en-GB', region: 'GB' })
      configured = true
    }
    void importLibrary('places').then((library) => {
      const { PlaceAutocompleteElement } = library as google.maps.PlacesLibrary
      const element = new PlaceAutocompleteElement({})
      element.addEventListener('gmp-select', async (event) => {
        const { placePrediction } = event as unknown as { placePrediction: google.maps.places.PlacePrediction }
        const place = placePrediction.toPlace()
        await place.fetchFields({ fields: ['id', 'formattedAddress', 'addressComponents'] })
        const parts = place.addressComponents ?? []
        const streetNumber = component(parts, 'street_number')
        const route = component(parts, 'route')
        callback.current({
          placeId: place.id,
          formattedAddress: place.formattedAddress ?? '',
          line1: [streetNumber, route].filter(Boolean).join(' '),
          city: component(parts, 'postal_town') || component(parts, 'locality'),
          region: component(parts, 'administrative_area_level_2') || component(parts, 'administrative_area_level_1'),
          postcode: component(parts, 'postal_code'),
          country: component(parts, 'country', true),
        })
      })
      container.appendChild(element)
    })
  }, [])

  return { mount, isAvailable: Boolean(key) }
}
