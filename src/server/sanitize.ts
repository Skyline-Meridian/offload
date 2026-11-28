import 'server-only'

import sanitizeHtml from 'sanitize-html'

export const DESCRIPTION_MAX_CHARS = 5000

const allowed: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' }, true),
  },
}

/** The text of an HTML description, for length checks and meta descriptions. */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cleans the rich text description: bold, italic, lists and https or mailto links only. */
export function sanitizeDescription(html: string): string {
  const clean = sanitizeHtml(html, {
    ...allowed,
    allowedAttributes: { a: ['href', 'rel', 'target'] },
  })
  return clean.trim()
}
