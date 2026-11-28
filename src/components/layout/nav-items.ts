import { routes } from '@/lib/routes'

export type NavItem = { label: string; href?: string; children?: readonly NavItem[] }

/** The main menu, copied from the WordPress "Main Menu". */
export const mainNav: readonly NavItem[] = [
  { label: 'Home', href: routes.home },
  { label: 'Players', href: routes.players },
  {
    label: 'Organisations',
    children: [
      { label: 'Clubs', href: routes.clubs },
      { label: 'Unions', href: routes.unions },
      { label: 'Colleges & Universities', href: routes.institutions },
      { label: 'Brands', href: routes.brands },
    ],
  },
  { label: 'Offers', href: routes.offers },
  { label: 'Pricing', href: routes.pricing },
  { label: 'About Us', href: routes.about },
  { label: 'Contact', href: routes.contact },
]

export const footerCompanyLinks: readonly NavItem[] = [
  { label: 'Home', href: routes.home },
  { label: 'About Us', href: routes.about },
  { label: 'Pricing', href: routes.pricing },
  { label: 'Players', href: routes.players },
]

export const footerQuickLinks: readonly NavItem[] = [
  { label: 'My account', href: routes.dashboard },
  { label: 'Terms and Conditions', href: routes.terms },
  { label: 'Privacy Policy', href: routes.privacy },
  { label: 'Refund Policy', href: routes.refundPolicy },
  { label: 'Contact', href: routes.contact },
]
