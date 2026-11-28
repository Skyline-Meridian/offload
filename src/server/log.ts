import 'server-only'

import { env } from '@/server/env'

type Level = 'debug' | 'info' | 'warn' | 'error'
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

// Keys that may hold personal data are dropped before anything is written.
const blocked = /email|token|cookie|password|secret|authorization|body|content|fileName|documentName|phone|note/i

function clean(value: unknown, depth = 0): unknown {
  if (depth > 3 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (!blocked.test(k)) out[k] = clean(v, depth + 1)
  }
  return out
}

function write(level: Level, message: string, data?: Record<string, unknown>): void {
  if (order[level] < order[env.LOG_LEVEL ?? 'info']) return
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...(clean(data) as object) })
  if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`)
  else process.stdout.write(`${line}\n`)
}

export const log = {
  debug: (message: string, data?: Record<string, unknown>) => write('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => write('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => write('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => write('error', message, data),
}

/** Error details safe to log: the name and message only, never the stack with values. */
export function errorInfo(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { errorName: error.name, errorMessage: error.message.slice(0, 300) }
  return { errorName: 'Unknown' }
}
