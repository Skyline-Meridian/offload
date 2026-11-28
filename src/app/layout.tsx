import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed, Urbanist } from 'next/font/google'
import { Suspense } from 'react'

import './globals.css'

import { CookieConsentBanner } from '@/components/layout/cookie-consent'
import { SiteFooter } from '@/app/site-footer'
import { SiteHeader } from '@/app/site-header'
import { SITE_NAME } from '@/lib/constants'
import { env } from '@/server/env'

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-barlow-semi-condensed',
})
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-barlow-condensed',
})
const urbanist = Urbanist({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-urbanist',
})
const barlow = Barlow({ subsets: ['latin', 'latin-ext'], weight: ['500'], display: 'swap', variable: '--font-barlow' })

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: `${SITE_NAME} | Women's rugby recruitment`, template: `%s | ${SITE_NAME}` },
  description: "Offload connects women's rugby players with clubs, unions, colleges, universities and brands.",
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html
      lang="en-GB"
      className={`${barlowSemiCondensed.variable} ${barlowCondensed.variable} ${urbanist.variable} ${barlow.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={<div className="h-3xl" />}>
          <SiteHeader />
        </Suspense>
        <div className="flex-1">{children}</div>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
        <CookieConsentBanner />
      </body>
    </html>
  )
}
