import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'

export type ActorContext = {
  /** User id, or null when the system acts (jobs, webhooks, migration). */
  actorId: string | null
  /** Role of the user, when known. */
  role: string | null
  /** For system actors: which part acted, for example "job:offer-expiry". */
  systemName: string | null
}

const storage = new AsyncLocalStorage<ActorContext>()

export function runAsUser<T>(userId: string, role: string | null, fn: () => Promise<T>): Promise<T> {
  return storage.run({ actorId: userId, role, systemName: null }, fn)
}

export function runAsSystem<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return storage.run({ actorId: null, role: null, systemName: name }, fn)
}

export function currentActor(): ActorContext {
  return storage.getStore() ?? { actorId: null, role: null, systemName: null }
}
