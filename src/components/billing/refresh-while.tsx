'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Spinner } from '@/components/ui/spinner'

/** Asks the server for a fresh page every 2 seconds, for up to `seconds` seconds. */
export function RefreshWhile({ seconds }: { seconds: number }): React.JSX.Element {
  const router = useRouter()
  useEffect(() => {
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += 2
      if (elapsed > seconds) clearInterval(timer)
      else router.refresh()
    }, 2000)
    return () => clearInterval(timer)
  }, [router, seconds])
  return <Spinner label="Waiting for confirmation" />
}
