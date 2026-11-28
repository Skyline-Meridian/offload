export const SITE_NAME = 'Offload'

/** Number of results loaded at a time in directories (see 01 section 16.4). */
export const PAGE_SIZE = 24

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 50

export const LOCKOUT_FAILURES = 5
export const LOCKOUT_MINUTES = 15

export const MINUTE = 60
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Rate limits. `windowSeconds` is a fixed window; `limit` is the highest count allowed in it. */
export const RATE_LIMITS = {
  signInIp: { limit: 20, windowSeconds: 15 * MINUTE },
  signInEmail: { limit: 5, windowSeconds: 15 * MINUTE },
  registerIp: { limit: 5, windowSeconds: HOUR },
  passwordResetEmail: { limit: 3, windowSeconds: HOUR },
  verificationResendUser: { limit: 3, windowSeconds: HOUR },
  messagesHour: { limit: 30, windowSeconds: HOUR },
  messagesDay: { limit: 200, windowSeconds: DAY },
  uploadsUser: { limit: 30, windowSeconds: HOUR },
  contactIp: { limit: 5, windowSeconds: HOUR },
} as const

export type RateLimitName = keyof typeof RATE_LIMITS

export const MB = 1024 * 1024

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'] as const
export const DOCUMENT_TYPES = [...IMAGE_TYPES, 'application/pdf'] as const

export type ImageVariant = 'avatar' | 'card' | 'header'

export const VARIANT_WIDTHS: Record<ImageVariant, number> = { avatar: 128, card: 400, header: 1200 }

/** What each upload purpose accepts and where it is stored (01 section 12.1). */
export const UPLOAD_PURPOSES = {
  PROFILE_PICTURE: { types: IMAGE_TYPES, maxBytes: 2 * MB, area: 'public', variants: ['avatar', 'card', 'header'] },
  ORGANISATION_LOGO: { types: IMAGE_TYPES, maxBytes: 2 * MB, area: 'public', variants: ['avatar', 'card', 'header'] },
  COACH_IMAGE: { types: IMAGE_TYPES, maxBytes: 2 * MB, area: 'public', variants: ['avatar', 'card'] },
  IDENTITY_DOCUMENT: { types: DOCUMENT_TYPES, maxBytes: 10 * MB, area: 'private', variants: [] },
  ORGANISATION_DOCUMENT: { types: DOCUMENT_TYPES, maxBytes: 10 * MB, area: 'private', variants: [] },
  CV: { types: ['application/pdf'], maxBytes: 10 * MB, area: 'private', variants: [] },
} as const satisfies Record<
  string,
  { types: readonly string[]; maxBytes: number; area: 'public' | 'private'; variants: readonly ImageVariant[] }
>

export type UploadPurposeKey = keyof typeof UPLOAD_PURPOSES

export const UPLOAD_URL_SECONDS = 10 * MINUTE
export const MEDIA_URL_SECONDS = HOUR
export const FILE_URL_SECONDS = 5 * MINUTE

/** URL segment for each organisation type (03 section 3). */
export const ORG_ROUTES = {
  CLUB: 'clubs',
  UNION: 'unions',
  INSTITUTION: 'colleges-universities',
  BRAND: 'brands',
} as const

export type OrgTypeKey = keyof typeof ORG_ROUTES

export const ORG_TYPE_LABELS: Record<OrgTypeKey, string> = {
  CLUB: 'Club',
  UNION: 'Union',
  INSTITUTION: 'College / University',
  BRAND: 'Brand',
}

/** Similarity above which two organisation names count as a possible duplicate. Tuned in the migration rehearsal. */
export const DUPLICATE_NAME_THRESHOLD = 0.6

export const OUTBOX_MAX_ATTEMPTS = 8
export const CONSENT_COOKIE_MONTHS = 12
export const COOKIE_POLICY_VERSION = '1'
