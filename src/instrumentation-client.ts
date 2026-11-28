import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.request?.cookies
      delete event.request?.data
      if (event.user) event.user = { id: event.user.id }
      return event
    },
  })
}
