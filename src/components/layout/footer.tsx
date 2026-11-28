import Image from 'next/image'
import Link from 'next/link'

import { Container } from '@/components/layout/container'
import { footerCompanyLinks, footerQuickLinks, type NavItem } from '@/components/layout/nav-items'
import { CookieSettingsLink } from '@/components/layout/cookie-settings-link'
import { SITE_NAME } from '@/lib/constants'

function LinkColumn({ title, items }: { title: string; items: readonly NavItem[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-xs">
      <h2 className="text-eyebrow">{title}</h2>
      <ul className="flex flex-col gap-2xs">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href ?? '/'} className="text-body text-white hover:text-accent">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

type Props = {
  supportEmail: string | null
  year: number
}

export function Footer({ supportEmail, year }: Props): React.JSX.Element {
  return (
    <footer className="bg-heading mt-4xl py-3xl">
      <Container className="flex flex-col gap-xl">
        <div className="grid gap-xl md:grid-cols-3">
          <div className="flex flex-col gap-xs">
            <Image src="/images/brand/logo-white.svg" alt={SITE_NAME} width={160} height={36} />
            <h2 className="text-eyebrow">Contact</h2>
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="text-body text-white hover:text-accent">
                {supportEmail}
              </a>
            ) : null}
          </div>
          <LinkColumn title="Company" items={footerCompanyLinks} />
          <LinkColumn title="Quick links" items={footerQuickLinks} />
        </div>
        <div className="border-text flex flex-wrap items-center justify-between gap-xs border-t pt-md">
          <p className="text-body text-text-light">
            {SITE_NAME} © Copyright {year}. All rights reserved.
          </p>
          <CookieSettingsLink />
        </div>
      </Container>
    </footer>
  )
}
