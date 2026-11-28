'use client'

import { useState } from 'react'

import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { usePlaceSearch } from '@/hooks/use-place-search'

type Common = {
  errors?: (name: string) => string[] | undefined
}

function PlaceSearch({ onFocus, mount, isAvailable }: { onFocus: () => void; mount: (el: HTMLElement | null) => void; isAvailable: boolean }): React.JSX.Element | null {
  if (!isAvailable) return null
  return (
    <div className="flex flex-col gap-2xs" onFocus={onFocus}>
      <span className="text-label">Search for an address</span>
      <div ref={mount} />
      <p className="text-hint">Pick an address from the list to fill the fields below and show it on the map.</p>
    </div>
  )
}

type SingleProps = Common & {
  name: string
  label: string
  defaultValue?: string
  defaultPlaceId?: string
}

/** One line of text plus an optional Google place id. Typing after a pick clears the place id. */
export function SingleAddressField({ name, label, defaultValue = '', defaultPlaceId = '', errors }: SingleProps): React.JSX.Element {
  const [text, setText] = useState(defaultValue)
  const [placeId, setPlaceId] = useState(defaultPlaceId)
  const { mount, isAvailable } = usePlaceSearch((place) => {
    setText(place.formattedAddress)
    setPlaceId(place.placeId)
  })
  return (
    <div className="flex flex-col gap-xs">
      <PlaceSearch onFocus={() => undefined} mount={mount} isAvailable={isAvailable} />
      <TextField
        name={name}
        label={label}
        value={text}
        onChange={(v) => {
          setText(v)
          setPlaceId('')
        }}
        errors={errors?.(name)}
        hint={isAvailable && !placeId && text ? 'Pick an address from the list to show it on the map' : undefined}
      />
      <input type="hidden" name={`${name}PlaceId`} value={placeId} />
    </div>
  )
}

export type FullAddressValue = {
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postcode: string
  country: string
  mapAddress: string
  placeId: string
}

type FullProps = Common & {
  value: FullAddressValue
  countries: SelectOption[]
  label?: string
}

/** The organisation address: separate lines, a country, and the one-line address used for the map. */
export function FullAddressField({ value, countries, errors, label = 'Address' }: FullProps): React.JSX.Element {
  const [v, setV] = useState(value)
  const set = (patch: Partial<FullAddressValue>): void => setV((current) => ({ ...current, ...patch }))
  const { mount, isAvailable } = usePlaceSearch((place) =>
    set({
      addressLine1: place.line1,
      city: place.city,
      region: place.region,
      postcode: place.postcode,
      country: place.country || v.country,
      mapAddress: place.formattedAddress,
      placeId: place.placeId,
    }),
  )
  const edited = (patch: Partial<FullAddressValue>): void => set({ ...patch, placeId: '' })
  return (
    <fieldset className="flex flex-col gap-md">
      <legend className="text-h5">{label}</legend>
      <PlaceSearch onFocus={() => undefined} mount={mount} isAvailable={isAvailable} />
      <TextField name="addressLine1" label="Address line 1" value={v.addressLine1} onChange={(x) => edited({ addressLine1: x })} errors={errors?.('addressLine1')} />
      <TextField name="addressLine2" label="Address line 2" value={v.addressLine2} onChange={(x) => edited({ addressLine2: x })} errors={errors?.('addressLine2')} />
      <div className="grid gap-md md:grid-cols-3">
        <TextField name="city" label="Town or city" value={v.city} onChange={(x) => edited({ city: x })} errors={errors?.('city')} />
        <TextField name="region" label="County or region" value={v.region} onChange={(x) => edited({ region: x })} errors={errors?.('region')} />
        <TextField name="postcode" label="Postcode" value={v.postcode} onChange={(x) => edited({ postcode: x })} errors={errors?.('postcode')} />
      </div>
      <Select name="country" label="Country" options={countries} required defaultValue={v.country} errors={errors?.('country')} />
      <TextField name="mapAddress" label="Address shown with the map" value={v.mapAddress} onChange={(x) => edited({ mapAddress: x })} errors={errors?.('mapAddress')} />
      <input type="hidden" name="placeId" value={v.placeId} />
    </fieldset>
  )
}
