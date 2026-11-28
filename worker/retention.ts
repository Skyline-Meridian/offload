import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '@/generated/prisma/client'
import { env } from '@/server/env'
import { errorInfo, log } from '@/server/log'

const RETENTION_DAYS = 365 * 2

/** Deletes audit events older than the retention period, with the one role that is allowed to. */
export async function runAuditRetention(): Promise<void> {
  if (!env.DATABASE_URL_RETENTION) {
    log.warn('audit retention skipped, DATABASE_URL_RETENTION is not set')
    return
  }
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL_RETENTION }) })
  try {
    const result = await client.auditEvent.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } },
    })
    log.info('audit retention finished', { deleted: result.count })
  } catch (error) {
    log.error('audit retention failed', errorInfo(error))
  } finally {
    await client.$disconnect()
  }
}
