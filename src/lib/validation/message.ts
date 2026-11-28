import { z } from 'zod'

export const MESSAGE_MAX_LENGTH = 2000

export const messageSchema = z.object({
  /** "U:<userId>" or "O:<organisationId>" */
  target: z.string().regex(/^[UO]:[0-9a-f-]{36}$/i, 'Choose who to message'),
  asOrganisation: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()),
  body: z.string().trim().min(1, 'Write a message').max(MESSAGE_MAX_LENGTH, `Use at most ${MESSAGE_MAX_LENGTH} characters`),
})

/** The party key of a user or an organisation. */
export const partyKey = (kind: 'U' | 'O', id: string): string => `${kind}:${id}`

/** One key for a pair of parties, whichever side is first. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

export function parsePartyKey(key: string): { kind: 'U' | 'O'; id: string } | null {
  const match = /^([UO]):([0-9a-f-]{36})$/i.exec(key)
  return match ? { kind: match[1] as 'U' | 'O', id: match[2]!.toLowerCase() } : null
}

/** Turns plain text into pieces with links, so message text is never rendered as HTML. */
export function linkify(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = []
  const pattern = /https?:\/\/[^\s<>"']+/gi
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > last) parts.push({ text: text.slice(last, start) })
    const url = match[0].replace(/[.,;:!?)]+$/, '')
    parts.push({ text: url, href: url })
    last = start + url.length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
