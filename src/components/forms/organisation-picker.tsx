'use client'

import { useEffect, useState } from 'react'

import { searchOrganisationOptions } from '@/actions/organisation'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/input'
import type { OrganisationPickerOption } from '@/lib/view-models/organisations'

type Props = {
  /** Hidden field that receives the chosen organisation id. */
  name: string
  label: string
  type: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND'
  defaultOption?: OrganisationPickerOption
  errors?: readonly string[]
  hint?: string
  /** Also let the user keep the text they typed (current club style fields). Reports the typed text through `onText`. */
  onText?: (text: string) => void
  onChange?: (option: OrganisationPickerOption | null) => void
}

/** Search published organisations of one type and pick one. The id goes into a hidden field. */
export function OrganisationPicker({ name, label, type, defaultOption, errors, hint, onText, onChange }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<OrganisationPickerOption[]>([])
  const [selected, setSelected] = useState<OrganisationPickerOption | null>(defaultOption ?? null)

  useEffect(() => {
    if (query.trim().length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      void searchOrganisationOptions(type, query).then((found) => {
        if (!cancelled) setOptions(found)
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, type])

  const shown = query.trim().length < 2 ? [] : options

  const choose = (option: OrganisationPickerOption | null): void => {
    setSelected(option)
    setQuery('')
    setOptions([])
    onChange?.(option)
  }

  return (
    <div className="flex flex-col gap-xs">
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      {selected ? (
        <div className="flex items-center justify-between gap-sm">
          <p className="text-body">
            <span className="text-label">{label}: </span>
            {selected.name}
            {selected.city ? `, ${selected.city}` : ''}
          </p>
          <Button variant="ghost" size="sm" onPress={() => choose(null)}>
            Change
          </Button>
        </div>
      ) : (
        <>
          <TextField
            label={label}
            value={query}
            onChange={(v) => {
              setQuery(v)
              onText?.(v)
            }}
            hint={hint ?? 'Type at least 2 letters, then choose from the list.'}
            errors={errors}
          />
          {shown.length > 0 ? (
            <ul className="bg-white border-thin border-border flex flex-col" aria-label={`${label} results`}>
              {shown.map((o) => (
                <li key={o.id}>
                  <button type="button" className="text-body hover:bg-surface w-full px-sm py-xs text-left" onClick={() => choose(o)}>
                    {o.name}
                    {o.city ? `, ${o.city}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  )
}
