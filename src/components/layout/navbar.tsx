'use client'

import { ChevronDown, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { Icon } from '@/components/ui/icon'
import { LinkButton } from '@/components/ui/button'
import { MessageBadge } from '@/components/messaging/message-badge'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Container } from '@/components/layout/container'
import { mainNav, type NavItem } from '@/components/layout/nav-items'
import { cn } from '@/lib/cn'
import { routes } from '@/lib/routes'

type Props = {
  /** Signed-in user's first name, or null when signed out. */
  signedInName: string | null
  unreadNotifications?: number
  unreadMessages?: number
}

const linkClass = 'text-button text-heading hover:text-accent transition-fast py-xs'

function isActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }): React.JSX.Element {
  if (item.children) {
    return (
      <li className="group relative">
        <button type="button" className={cn(linkClass, 'flex items-center gap-2xs')} aria-haspopup="true">
          {item.label}
          <Icon icon={ChevronDown} size="sm" />
        </button>
        <ul className="bg-white shadow-overlay border-thin border-border z-dropdown hidden min-w-menu flex-col p-xs group-focus-within:flex group-hover:flex lg:absolute max-lg:static max-lg:flex max-lg:border-0 max-lg:shadow-none">
          {item.children.map((child) => (
            <li key={child.label}>
              <Link href={child.href ?? '/'} className={cn(linkClass, 'block px-xs')} onClick={onNavigate}>
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </li>
    )
  }
  return (
    <li>
      <Link
        href={item.href ?? '/'}
        className={cn(linkClass, isActive(pathname, item.href) && 'text-accent')}
        aria-current={isActive(pathname, item.href) ? 'page' : undefined}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
    </li>
  )
}

export function Navbar({ signedInName, unreadNotifications = 0, unreadMessages = 0 }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const close = (): void => setOpen(false)

  return (
    <header className="bg-white border-border z-sticky sticky top-0 border-b">
      <Container className="flex items-center justify-between gap-md py-xs">
        <Link href={routes.home} aria-label="Offload home" className="shrink-0">
          <Image src="/images/brand/logo.svg" alt="Offload" width={160} height={36} priority />
        </Link>

        <button
          type="button"
          className="text-heading lg:hidden"
          aria-expanded={open}
          aria-controls="main-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon icon={open ? X : Menu} size="lg" />
        </button>

        <nav
          id="main-menu"
          aria-label="Main"
          className={cn('flex-1 max-lg:absolute max-lg:inset-x-0 max-lg:top-full max-lg:bg-white max-lg:p-md', !open && 'max-lg:hidden')}
        >
          <ul className="flex items-center justify-end gap-lg max-lg:flex-col max-lg:items-start max-lg:gap-xs">
            {mainNav.map((item) => (
              <NavLink key={item.label} item={item} pathname={pathname} onNavigate={close} />
            ))}
            {signedInName ? (
              <>
                <li>
                  <MessageBadge initialUnread={unreadMessages} />
                </li>
                <li>
                  <NotificationBell initialUnread={unreadNotifications} />
                </li>
              </>
            ) : null}
            <li>
              {signedInName ? (
                <LinkButton href={routes.dashboard} size="sm" onClick={close}>
                  My Profile
                </LinkButton>
              ) : (
                <LinkButton href={routes.login} size="sm" onClick={close}>
                  Sign-In
                </LinkButton>
              )}
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  )
}
