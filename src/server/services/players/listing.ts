import 'server-only'

import type { Tx } from '@/server/db'

/** Puts a verified player in the directory. The first listing date is kept (it is the sort order). */
export async function listPlayer(tx: Tx, userId: string): Promise<void> {
  const profile = await tx.playerProfile.findUnique({ where: { userId }, select: { listedAt: true } })
  if (!profile) return
  if (profile.listedAt === null) {
    await tx.playerProfile.update({ where: { userId }, data: { listedAt: new Date() } })
  }
}

/** Removes a player from the directory (revoked, suspended or deleted). */
export async function unlistPlayer(tx: Tx, userId: string): Promise<void> {
  await tx.playerProfile.updateMany({ where: { userId }, data: { listedAt: null } })
}
