import * as Sentry from '@sentry/nextjs'

export async function register(): Promise<void> {
  const dsn = process.env.GLITCHTIP_DSN
  if (!dsn || process.env.NEXT_RUNTIME !== 'nodejs') return
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.request?.cookies
      delete event.request?.data
      if (event.request?.headers) delete event.request.headers.cookie
      if (event.user) event.user = { id: event.user.id }
      return event
    },
  })
}

export const onRequestError = Sentry.captureRequestError
