import 'server-only'

/** The caller's IP address, as passed on by the reverse proxy. Used for rate limits only. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}

/** Copy of the request headers with the reCAPTCHA token in the place the Better Auth captcha plugin reads. */
export function withCaptcha(headers: Headers, token: string | undefined): Headers {
  const copy = new Headers(headers)
  if (token) copy.set('x-captcha-response', token)
  return copy
}
