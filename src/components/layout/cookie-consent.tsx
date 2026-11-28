'use client'

import 'vanilla-cookieconsent/dist/cookieconsent.css'

import { useEffect } from 'react'
import * as CookieConsent from 'vanilla-cookieconsent'

import { saveCookieConsent } from '@/actions/consent'
import { CONSENT_COOKIE_MONTHS, COOKIE_POLICY_VERSION } from '@/lib/constants'
import { routes } from '@/lib/routes'

/** The cookie banner. Categories: necessary (always on) and maps (Google Maps embeds). */
export function CookieConsentBanner(): null {
  useEffect(() => {
    void CookieConsent.run({
      revision: Number(COOKIE_POLICY_VERSION),
      cookie: { name: 'offload_consent', expiresAfterDays: CONSENT_COOKIE_MONTHS * 30, sameSite: 'Lax' },
      guiOptions: { consentModal: { layout: 'box inline', position: 'bottom left' } },
      categories: {
        necessary: { enabled: true, readOnly: true },
        maps: {},
      },
      onConsent: () => {
        void saveCookieConsent({ categories: CookieConsent.getUserPreferences().acceptedCategories })
      },
      onChange: () => {
        void saveCookieConsent({ categories: CookieConsent.getUserPreferences().acceptedCategories })
      },
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: 'Cookies',
              description: `We use necessary cookies to keep you signed in. With your permission we also load Google Maps. Read our <a href="${routes.cookies}">cookie policy</a>.`,
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Necessary only',
              showPreferencesBtn: 'Manage preferences',
            },
            preferencesModal: {
              title: 'Cookie settings',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Necessary only',
              savePreferencesBtn: 'Save settings',
              closeIconLabel: 'Close',
              sections: [
                {
                  title: 'Necessary',
                  description: 'These keep you signed in and the site secure. They cannot be turned off.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Maps',
                  description: 'Loads Google Maps on organisation pages. Google may set cookies.',
                  linkedCategory: 'maps',
                },
              ],
            },
          },
        },
      },
    })
  }, [])
  return null
}
