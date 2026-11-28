import 'server-only'

import { z } from 'zod'

// Empty strings count as "not set", so a blank line in .env.local behaves like a missing key.
const optional = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional())
const required = z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: required,
  DATABASE_URL_REALTIME: optional,
  DATABASE_URL_RETENTION: optional,

  BETTER_AUTH_SECRET: z.string().min(32),
  JOB_SECRET: z.string().min(32),

  STORAGE_DRIVER: z.enum(['local', 'gcs']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('.local-storage'),
  EMAIL_DRIVER: z.enum(['log', 'smtp2go']).default('log'),
  OUTBOUND_MODE: z.enum(['redirect', 'live']).default('redirect'),
  OUTBOUND_REDIRECT_EMAIL: optional,

  RECAPTCHA_SECRET_KEY: optional,

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_PORTAL_CONFIGURATION_ID: optional,

  GCP_PROJECT_ID: optional,
  GCS_UPLOADS_BUCKET: optional,
  GCS_USER_CONTENT_BUCKET: optional,

  SMTP2GO_API_KEY: optional,
  SMTP2GO_WEBHOOK_SECRET: optional,
  EMAIL_FROM_ADDRESS: optional,
  EMAIL_FROM_NAME: z.string().default('Offload'),

  KIT_API_KEY: optional,
  KIT_WEBHOOK_SECRET: optional,
  KIT_TAG_ID: optional,

  GOOGLE_PLACES_SERVER_KEY: optional,
  GLITCHTIP_DSN: optional,
  REALTIME_PORT: z.coerce.number().int().default(3001),
})

export type Env = z.infer<typeof schema>

function load(): Env {
  // The Docker build has no secrets. It sets SKIP_ENV_VALIDATION=1 and the real check runs at start-up.
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    return process.env as unknown as Env
  }
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))]
    throw new Error(`Invalid or missing environment variables: ${names.join(', ')}`)
  }
  return parsed.data
}

export const env: Env = load()
