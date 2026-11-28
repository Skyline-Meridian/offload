// The realtime server: one WebSocket per browser tab, fed by PostgreSQL LISTEN/NOTIFY (01 section 11).
// It uses the read-only database role and never imports the web app's code, so it stays small.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'

import pg from 'pg'
import { WebSocketServer, type WebSocket } from 'ws'

const PORT = Number(process.env.REALTIME_PORT ?? 3001)
const APP_ORIGIN = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin
const SECRET = process.env.BETTER_AUTH_SECRET ?? ''
const DATABASE_URL = process.env.DATABASE_URL_REALTIME ?? ''
const MAX_SOCKETS_PER_USER = 10
const PING_MS = 30_000

if (SECRET.length < 32 || !DATABASE_URL) {
  process.stderr.write('realtime: BETTER_AUTH_SECRET and DATABASE_URL_REALTIME must be set\n')
  process.exit(1)
}

function log(level: 'info' | 'warn' | 'error', message: string, data: Record<string, unknown> = {}): void {
  process.stdout.write(`${JSON.stringify({ level, time: new Date().toISOString(), service: 'realtime', message, ...data })}\n`)
}

// ─── Session check ──────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 })

/** Better Auth stores the session as "<token>.<base64 HMAC-SHA256 signature>", URL-encoded, in a cookie. */
function sessionTokenFromCookie(header: string | undefined): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=')
    if (!rawName || !/(^|__Secure-)better-auth\.session_token$/.test(rawName)) continue
    const value = decodeURIComponent(rest.join('='))
    const dot = value.lastIndexOf('.')
    if (dot < 1) return null
    const token = value.slice(0, dot)
    const signature = Buffer.from(value.slice(dot + 1), 'base64')
    const expected = createHmac('sha256', SECRET).update(token).digest()
    return signature.length === expected.length && timingSafeEqual(signature, expected) ? token : null
  }
  return null
}

type Identity = { userId: string; channels: Set<string> }

async function channelsFor(userId: string): Promise<Set<string>> {
  const channels = new Set<string>([`U:${userId}`])
  const members = await pool.query<{ organisationId: string }>(
    `SELECT "organisationId" FROM "OrganisationMember" WHERE "userId" = $1::uuid AND "status" = 'ACTIVE'`,
    [userId],
  )
  for (const row of members.rows) channels.add(`O:${row.organisationId}`)
  return channels
}

async function authenticate(request: IncomingMessage): Promise<Identity | null> {
  const token = sessionTokenFromCookie(request.headers.cookie)
  if (!token) return null
  const result = await pool.query<{ userId: string }>(
    `SELECT s."userId" FROM "Session" s JOIN "User" u ON u."id" = s."userId"
     WHERE s."token" = $1 AND s."expiresAt" > now() AND u."status" = 'ACTIVE'`,
    [token],
  )
  const userId = result.rows[0]?.userId
  return userId ? { userId, channels: await channelsFor(userId) } : null
}

// ─── Connections ────────────────────────────────────────────────────────

type Connection = { socket: WebSocket; identity: Identity; alive: boolean }
const connections = new Set<Connection>()

function connectionsOf(userId: string): Connection[] {
  return [...connections].filter((c) => c.identity.userId === userId)
}

function send(connection: Connection, event: unknown): void {
  if (connection.socket.readyState === connection.socket.OPEN) connection.socket.send(JSON.stringify(event))
}

type Event =
  | { type: 'notification.created'; userId: string }
  | { type: 'message.created'; conversationId: string; messageId: string; parties: string[] }
  | { type: 'conversation.read'; conversationId: string; parties: string[] }
  | { type: 'membership.changed'; userId: string }
  | { type: 'session.revoked'; userId: string }

async function dispatch(event: Event): Promise<void> {
  switch (event.type) {
    case 'notification.created':
      for (const c of connectionsOf(event.userId)) send(c, { type: event.type })
      break
    case 'message.created':
    case 'conversation.read':
      for (const c of connections) {
        if (event.parties.some((p) => c.identity.channels.has(p))) {
          send(c, { type: event.type, conversationId: event.conversationId, ...('messageId' in event ? { messageId: event.messageId } : {}) })
        }
      }
      break
    case 'membership.changed':
      for (const c of connectionsOf(event.userId)) {
        c.identity.channels = await channelsFor(event.userId)
        send(c, { type: event.type })
      }
      break
    case 'session.revoked':
      for (const c of connectionsOf(event.userId)) c.socket.close(4001, 'session ended')
      break
  }
}

// ─── HTTP and upgrade ───────────────────────────────────────────────────

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end('{"ok":true}')
    return
  }
  response.writeHead(404)
  response.end()
})

const wss = new WebSocketServer({ noServer: true })

function refuse(socket: Duplex, status: number, text: string): void {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

server.on('upgrade', (request, socket, head) => {
  void (async () => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      if (url.pathname !== '/ws') return refuse(socket, 404, 'Not Found')
      if (request.headers.origin !== APP_ORIGIN) return refuse(socket, 403, 'Forbidden')
      const identity = await authenticate(request)
      if (!identity) return refuse(socket, 401, 'Unauthorized')

      wss.handleUpgrade(request, socket, head, (ws) => {
        const connection: Connection = { socket: ws, identity, alive: true }
        // At most 10 sockets per user: close the oldest.
        const own = connectionsOf(identity.userId)
        if (own.length >= MAX_SOCKETS_PER_USER) own[0]?.socket.close(4002, 'too many connections')
        connections.add(connection)
        ws.on('pong', () => {
          connection.alive = true
        })
        ws.on('close', () => connections.delete(connection))
        ws.on('error', () => connections.delete(connection))
        send(connection, { type: 'ready' })
      })
    } catch (error) {
      log('error', 'upgrade failed', { errorName: error instanceof Error ? error.name : 'Unknown' })
      refuse(socket, 500, 'Internal Server Error')
    }
  })()
})

setInterval(() => {
  for (const connection of connections) {
    if (!connection.alive) {
      connection.socket.terminate()
      connections.delete(connection)
      continue
    }
    connection.alive = false
    connection.socket.ping()
  }
}, PING_MS)

// ─── LISTEN with reconnect ──────────────────────────────────────────────

let retry = 0
function listen(): void {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  let closed = false
  const reconnect = (): void => {
    if (closed) return
    closed = true
    client.end().catch(() => undefined)
    const delay = Math.min(30_000, 1000 * 2 ** retry)
    retry += 1
    log('warn', 'database connection lost, reconnecting', { delay })
    setTimeout(listen, delay)
  }
  client.on('error', reconnect)
  client.on('end', reconnect)
  client.on('notification', (message) => {
    if (message.channel !== 'realtime' || !message.payload) return
    try {
      void dispatch(JSON.parse(message.payload) as Event)
    } catch {
      log('warn', 'bad realtime payload')
    }
  })
  client
    .connect()
    .then(() => client.query('LISTEN realtime'))
    .then(() => {
      retry = 0
      log('info', 'listening for events')
    })
    .catch(reconnect)
}

listen()
server.listen(PORT, () => log('info', 'realtime server started', { port: PORT, origin: APP_ORIGIN }))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    log('info', 'realtime server stopping')
    wss.close()
    server.close(() => process.exit(0))
  })
}
