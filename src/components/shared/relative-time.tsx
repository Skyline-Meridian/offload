'use client'

import { formatDistanceToNow } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { useEffect, useState } from 'react'

import { formatDateTime } from '@/lib/format/date'

/** "3 hours ago", with the full UK date on hover. Rendered as a date on the server so the HTML matches. */
export function RelativeTime({ date }: { date: Date | string }): React.JSX.Element {
  const value = typeof date === 'string' ? new Date(date) : date
  const time = value.getTime()
  const [text, setText] = useState(() => formatDateTime(value))
  useEffect(() => {
    const update = (): void => setText(formatDistanceToNow(time, { addSuffix: true, locale: enGB }))
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [time])
  return (
    <time dateTime={value.toISOString()} title={formatDateTime(value)}>
      {text}
    </time>
  )
}
