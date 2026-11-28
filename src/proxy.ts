import { NextResponse, type NextRequest } from 'next/server'

const isDev = process.env.NODE_ENV === 'development'
const glitchtipHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_GLITCHTIP_DSN ? new URL(process.env.NEXT_PUBLIC_GLITCHTIP_DSN).origin : ''
  } catch {
    return ''
  }
})()
const realtimeOrigin = (process.env.NEXT_PUBLIC_REALTIME_URL ?? '').replace(/\/ws$/, '')

// Pages are prerendered where they can be, so a per-request nonce cannot be added to their scripts.
// Scripts are limited to our own origin, inline bootstrap code and the listed Google and Stripe hosts.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.google.com https://www.gstatic.com https://maps.googleapis.com https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://storage.googleapis.com",
  "font-src 'self' data:",
  `connect-src 'self' ${realtimeOrigin} https://maps.googleapis.com https://api.stripe.com ${glitchtipHost}`.trim(),
  "frame-src 'self' https://www.google.com https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next({ request: { headers: new Headers(request.headers) } })
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (!isDev) response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
