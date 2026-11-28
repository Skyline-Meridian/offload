import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '@/generated/prisma/client'
import { modelsWithCreatedBy, modelsWithUpdatedBy } from '@/server/actor-models'
import { currentActor } from '@/server/context'
import { env } from '@/server/env'

type Data = Record<string, unknown>

function withActor(data: Data, model: string, kind: 'create' | 'update'): Data {
  const { actorId } = currentActor()
  const out: Data = { ...data }
  if (kind === 'create' && modelsWithCreatedBy.has(model) && out.createdById === undefined) out.createdById = actorId
  if (modelsWithUpdatedBy.has(model) && out.updatedById === undefined) out.updatedById = actorId
  return out
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  return new PrismaClient({ adapter }).$extends({
    name: 'actor-columns',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = args as Record<string, unknown>
          switch (operation) {
            case 'create':
              a.data = withActor(a.data as Data, model, 'create')
              break
            case 'createMany':
            case 'createManyAndReturn': {
              const rows = a.data as Data | Data[]
              a.data = Array.isArray(rows)
                ? rows.map((r) => withActor(r, model, 'create'))
                : withActor(rows, model, 'create')
              break
            }
            case 'update':
            case 'updateMany':
            case 'updateManyAndReturn':
              a.data = withActor(a.data as Data, model, 'update')
              break
            case 'upsert':
              a.create = withActor(a.create as Data, model, 'create')
              a.update = withActor(a.update as Data, model, 'update')
              break
            default:
              break
          }
          return query(args)
        },
      },
    },
  })
}

export type Db = ReturnType<typeof createClient>
/** The transaction client passed to services, `audit()`, `enqueue()` and `notifyRealtime()`. */
export type Tx = Parameters<Parameters<Db['$transaction']>[0]>[0]

const globalForDb = globalThis as unknown as { __offloadDb?: Db }

export const db: Db = globalForDb.__offloadDb ?? createClient()
if (env.NODE_ENV !== 'production') globalForDb.__offloadDb = db
