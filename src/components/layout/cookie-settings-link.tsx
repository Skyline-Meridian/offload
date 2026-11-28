'use client'

import { showPreferences } from 'vanilla-cookieconsent'

export function CookieSettingsLink(): React.JSX.Element {
  return (
    <button type="button" className="text-body text-white hover:text-accent" onClick={() => showPreferences()}>
      Cookie settings
    </button>
  )
}
