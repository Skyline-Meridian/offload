/** Every internal link goes through here, so a path changes in one place. */
export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  checkEmail: '/check-email',
  dashboard: '/dashboard',
  players: '/players',
  player: (id: string) => `/players/${id}`,
  clubs: '/clubs',
  club: (slug: string) => `/clubs/${slug}`,
  unions: '/unions',
  union: (slug: string) => `/unions/${slug}`,
  institutions: '/colleges-universities',
  institution: (slug: string) => `/colleges-universities/${slug}`,
  brands: '/brands',
  brand: (slug: string) => `/brands/${slug}`,
  /** Directory page of a type. */
  orgDirectory: (type: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND') =>
    `/${{ CLUB: 'clubs', UNION: 'unions', INSTITUTION: 'colleges-universities', BRAND: 'brands' }[type]}`,
  /** Public page of an organisation. */
  orgPage: (type: 'CLUB' | 'UNION' | 'INSTITUTION' | 'BRAND', slug: string) =>
    `/${{ CLUB: 'clubs', UNION: 'unions', INSTITUTION: 'colleges-universities', BRAND: 'brands' }[type]}/${slug}`,
  myOrganisation: '/dashboard/organisation',
  about: '/about',
  refundPolicy: '/refund-policy',
  offers: '/offers',
  offer: (id: string) => `/offers/${id}`,
  messages: '/messages',
  notifications: '/notifications',
  pricing: '/pricing',
  contact: '/contact',
  terms: '/terms-and-conditions',
  privacy: '/privacy-policy',
  cookies: '/cookie-policy',
  media: (fileId: string, variant: string) => `/media/${fileId}/${variant}`,
  file: (fileId: string) => `/files/${fileId}`,
} as const

/** Returns `next` only when it is a safe internal path, otherwise the fallback. */
export function safeNextPath(next: string | null | undefined, fallback: string = routes.dashboard): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback
  return next
}

export function loginWithNext(next: string): string {
  return `${routes.login}?next=${encodeURIComponent(next)}`
}
