'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type RealtimeEvent =
  | { type: 'ready' }
  | { type: 'notification.created' }
  | { type: 'message.created'; conversationId: string; messageId: string }
  | { type: 'conversation.read'; conversationId: string }
  | { type: 'membership.changed' }
  /** Sent by this hook after the connection came back, so views can catch up on what they missed. */
  | { type: 'reconnected' }

type Listener = (event: RealtimeEvent) => void
type Status = 'idle' | 'open' | 'reconnecting'

type Context = { status: Status; subscribe: (listener: Listener) => () => void }

const RealtimeContext = createContext<Context | null>(null)

const RETRY_MS = [1000, 2000, 5000, 10_000, 30_000]
const url = process.env.NEXT_PUBLIC_REALTIME_URL

/**
 * One WebSocket for the whole page. It opens when the first view subscribes and closes when the last one leaves.
 * After a drop it retries after 1, 2, 5 and 10 seconds, then every 30 seconds.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<Status>('idle')
  const [subscribers, setSubscribers] = useState(0)
  const listeners = useRef(new Set<Listener>())

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener)
    setSubscribers((n) => n + 1)
    return () => {
      listeners.current.delete(listener)
      setSubscribers((n) => n - 1)
    }
  }, [])

  const active = subscribers > 0
  useEffect(() => {
    if (!active || !url) return
    let stopped = false
    let socket: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let wasDown = false

    const emit = (event: RealtimeEvent): void => {
      for (const listener of listeners.current) listener(event)
    }
    const connect = (): void => {
      socket = new WebSocket(url)
      socket.onopen = () => {
        attempt = 0
        setStatus('open')
        if (wasDown) emit({ type: 'reconnected' })
        wasDown = false
      }
      socket.onmessage = (message) => {
        try {
          emit(JSON.parse(String(message.data)) as RealtimeEvent)
        } catch {
          // ignore anything that is not one of our events
        }
      }
      socket.onclose = () => {
        if (stopped) return
        wasDown = true
        setStatus('reconnecting')
        timer = setTimeout(connect, RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)])
        attempt += 1
      }
    }
    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      socket?.close()
      setStatus('idle')
    }
  }, [active])

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe])
  return (
    <RealtimeContext.Provider value={value}>
      {status === 'reconnecting' ? (
        <div role="status" className="bg-warning-surface text-warning text-body z-toast fixed inset-x-0 bottom-0 p-xs text-center">
          Reconnecting…
        </div>
      ) : null}
      {children}
    </RealtimeContext.Provider>
  )
}

/** Calls `handler` for every event while the component is mounted. Keeps the connection open. */
export function useRealtime(handler: Listener): void {
  const context = useContext(RealtimeContext)
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  const subscribe = context?.subscribe
  useEffect(() => {
    if (!subscribe) return
    return subscribe((event) => latest.current(event))
  }, [subscribe])
}
