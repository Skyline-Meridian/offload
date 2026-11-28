'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type Page<T> = { items: T[]; nextCursor: string | null }

type Props<T extends { id: string }> = {
  initialItems: T[]
  initialCursor: string | null
  /** Loads the next page. Runs as a Server Action. */
  loadMore: (cursor: string) => Promise<Page<T> | null>
  renderItem: (item: T) => React.ReactNode
  listClassName?: string
}

/**
 * A list that loads the next page when the sentinel scrolls into view. The "Load more" button is always
 * there as a fallback. The current cursor goes into the address, so the back button returns to the same place.
 */
export function InfiniteList<T extends { id: string }>({
  initialItems,
  initialCursor,
  loadMore,
  renderItem,
  listClassName,
}: Props<T>): React.JSX.Element {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [pending, startTransition] = useTransition()
  const sentinel = useRef<HTMLDivElement>(null)
  const busy = useRef(false)

  const next = useCallback(() => {
    if (!cursor || busy.current) return
    busy.current = true
    startTransition(async () => {
      const page = await loadMore(cursor)
      if (page) {
        setItems((current) => {
          const seen = new Set(current.map((i) => i.id))
          return [...current, ...page.items.filter((i) => !seen.has(i.id))]
        })
        setCursor(page.nextCursor)
        const url = new URL(window.location.href)
        if (page.nextCursor) url.searchParams.set('cursor', page.nextCursor)
        else url.searchParams.delete('cursor')
        window.history.replaceState(null, '', url)
      } else {
        setCursor(null)
      }
      busy.current = false
    })
  }, [cursor, loadMore])

  useEffect(() => {
    const element = sentinel.current
    if (!element || !cursor) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) next()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [cursor, next])

  return (
    <div className="flex flex-col gap-lg">
      <ul className={listClassName}>{items.map((item) => renderItem(item))}</ul>
      <div ref={sentinel} aria-hidden="true" />
      {pending ? <Spinner className="self-center" /> : null}
      {cursor ? (
        <Button variant="ghost" className="self-center" onPress={next} isDisabled={pending}>
          Load more
        </Button>
      ) : null}
    </div>
  )
}
