'use client'

import { useCallback } from 'react'

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

type Grecaptcha = {
  ready: (cb: () => void) => void
  execute: (key: string, options: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}

let loading: Promise<void> | null = null

function loadScript(key: string): Promise<void> {
  if (window.grecaptcha) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('reCAPTCHA failed to load'))
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Returns a function that gets a reCAPTCHA v3 token for `action`. The script is loaded only when a form
 * that needs it asks for a token. With no site key it returns an empty string (local development).
 */
export function useRecaptcha(): (action: string) => Promise<string> {
  return useCallback(async (action: string) => {
    if (!siteKey) return ''
    await loadScript(siteKey)
    const grecaptcha = window.grecaptcha
    if (!grecaptcha) return ''
    await new Promise<void>((resolve) => grecaptcha.ready(resolve))
    return grecaptcha.execute(siteKey, { action })
  }, [])
}
