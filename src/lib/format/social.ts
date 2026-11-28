export const socialNetworks = ['instagram', 'youtube', 'linkedin', 'facebook', 'x'] as const
export type SocialNetwork = (typeof socialNetworks)[number]

const config: Record<SocialNetwork, { label: string; hosts: readonly string[]; profileUrl: (handle: string) => string }> = {
  instagram: { label: 'Instagram', hosts: ['instagram.com', 'www.instagram.com'], profileUrl: (h) => `https://www.instagram.com/${h}` },
  youtube: { label: 'YouTube', hosts: ['youtube.com', 'www.youtube.com', 'youtu.be'], profileUrl: (h) => `https://www.youtube.com/@${h}` },
  linkedin: { label: 'LinkedIn', hosts: ['linkedin.com', 'www.linkedin.com'], profileUrl: (h) => `https://www.linkedin.com/in/${h}` },
  facebook: { label: 'Facebook', hosts: ['facebook.com', 'www.facebook.com', 'fb.com'], profileUrl: (h) => `https://www.facebook.com/${h}` },
  x: { label: 'X', hosts: ['x.com', 'twitter.com'], profileUrl: (h) => `https://x.com/${h}` },
}

export type SocialResult = { ok: true; url: string | null } | { ok: false; message: string }

/** Turns a handle or a link into the network's canonical https address. Empty input means "no link". */
export function normaliseSocial(network: SocialNetwork, input: string): SocialResult {
  const value = input.trim()
  if (!value) return { ok: true, url: null }
  const { label, hosts, profileUrl } = config[network]
  const fail: SocialResult = { ok: false, message: `Enter a ${label} handle or a ${label} link` }

  if (/^@?[A-Za-z0-9._-]+$/.test(value)) return { ok: true, url: profileUrl(value.replace(/^@/, '')) }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return fail
  }
  if (!['http:', 'https:'].includes(url.protocol) || !hosts.includes(url.hostname.toLowerCase())) return fail
  const path = url.pathname.replace(/\/+$/, '')
  return { ok: true, url: `https://${url.hostname.toLowerCase()}${path}` }
}
