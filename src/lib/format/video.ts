export type ParsedVideo = { provider: 'youtube' | 'vimeo'; id: string; canonicalUrl: string }

/** Accepts YouTube (watch, youtu.be, shorts) and Vimeo links. Returns null for anything else. */
export function parseVideoUrl(input: string): ParsedVideo | null {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const idPattern = /^[A-Za-z0-9_-]{6,20}$/

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const shorts = url.pathname.match(/^\/shorts\/([^/]+)/)
    const id = shorts?.[1] ?? (url.pathname === '/watch' ? url.searchParams.get('v') : null)
    if (id && idPattern.test(id)) return { provider: 'youtube', id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` }
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? ''
    if (idPattern.test(id)) return { provider: 'youtube', id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` }
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.match(/^\/(\d{5,12})/)?.[1]
    if (id) return { provider: 'vimeo', id, canonicalUrl: `https://vimeo.com/${id}` }
  }
  return null
}

export function embedUrl(video: ParsedVideo): string {
  return video.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${video.id}`
    : `https://player.vimeo.com/video/${video.id}?dnt=1`
}
