import { Cron } from 'croner'
import * as Sentry from '@sentry/node'

import { OUTBOX_MAX_ATTEMPTS } from '@/lib/constants'
import { runAsSystem } from '@/server/context'
import { db } from '@/server/db'
import { env } from '@/server/env'
import { errorInfo, log } from '@/server/log'
import { runHandler } from '@/server/outbox-handlers'
import { runAuditRetention } from './retention'
import './handlers'

if (env.GLITCHTIP_DSN) Sentry.init({ dsn: env.GLITCHTIP_DSN })

const webUrl = process.env.WEB_URL ?? 'http://localhost:3000'

const schedule: { job: string; cron: string }[] = [
  { job: 'offer-expiry', cron: '5 * * * *' },
  { job: 'unverified-accounts', cron: '0 3 * * *' },
  { job: 'staff-summary', cron: '0 8 * * *' },
  { job: 'billing', cron: '0 9 * * *' },
  { job: 'billing-reconciliation', cron: '0 4 * * *' },
  { job: 'newsletter-sync', cron: '0 5 * * *' },
  { job: 'cleanup', cron: '30 2 * * *' },
  { job: 'billing-retention', cron: '30 4 1 1 *' },
]

type OutboxRow = { id: string; type: string; payload: unknown; attempts: number }

async function processOutbox(): Promise<number> {
  return db.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT "id", "type", "payload", "attempts" FROM "OutboxMessage"
        WHERE "status" = 'PENDING' AND "nextAttemptAt" <= now()
        ORDER BY "createdAt" LIMIT 20
        FOR UPDATE SKIP LOCKED`
      for (const row of rows) {
        try {
          await runAsSystem(`outbox:${row.type}`, () => runHandler(row.type, row.payload))
          await tx.outboxMessage.update({ where: { id: row.id }, data: { status: 'SENT', lastError: null } })
        } catch (error) {
          const attempts = row.attempts + 1
          const failed = attempts >= OUTBOX_MAX_ATTEMPTS
          log.error('outbox message failed', { outboxType: row.type, attempts, ...errorInfo(error) })
          await tx.outboxMessage.update({
            where: { id: row.id },
            data: {
              attempts,
              status: failed ? 'FAILED' : 'PENDING',
              nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
              lastError: error instanceof Error ? error.message.slice(0, 300) : 'Unknown error',
            },
          })
        }
      }
      return rows.length
    },
    { timeout: 120_000, maxWait: 10_000 },
  )
}

async function callJob(job: string): Promise<void> {
  try {
    const response = await fetch(`${webUrl}/api/jobs/${job}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.JOB_SECRET}` },
    })
    // Jobs that are not built yet answer 404. That is expected while the platform is being built.
    if (!response.ok && response.status !== 404) log.error('job call failed', { job, status: response.status })
  } catch (error) {
    log.error('job call failed', { job, ...errorInfo(error) })
  }
}

let running = false
async function tick(): Promise<void> {
  if (running) return
  running = true
  try {
    while ((await processOutbox()) === 20) {
      // keep draining while the batches are full
    }
  } catch (error) {
    log.error('outbox loop failed', errorInfo(error))
  } finally {
    running = false
  }
}

log.info('worker started', { outboundMode: env.OUTBOUND_MODE, emailDriver: env.EMAIL_DRIVER, storageDriver: env.STORAGE_DRIVER })

setInterval(() => void tick(), 2000)
for (const { job, cron } of schedule) {
  new Cron(cron, { timezone: 'Europe/London', protect: true }, () => void callJob(job))
}
new Cron('0 2 * * *', { timezone: 'Europe/London', protect: true }, () => void runAuditRetention())

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    log.info('worker stopping')
    void db.$disconnect().finally(() => process.exit(0))
  })
}
