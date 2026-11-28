import 'server-only'

import { hash as argonHash, verify as argonVerify, type Algorithm } from '@node-rs/argon2'

import { PHPASS_SETTING_LENGTH, phpassHash } from '@/server/auth/phpass'

const ARGON2ID = 2 as Algorithm
const WRAPPED_PREFIX = 'wp-phpass$'

export async function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, { algorithm: ARGON2ID, memoryCost: 19456, timeCost: 2, parallelism: 1 })
}

/**
 * Checks a password against a stored value:
 * - `$argon2id$…`: a normal hash.
 * - `wp-phpass$<setting>$<argon2 hash>`: a WordPress phpass hash that was wrapped in Argon2id on import.
 */
export async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2id$')) return await argonVerify(hash, password)
    if (hash.startsWith(WRAPPED_PREFIX)) {
      const rest = hash.slice(WRAPPED_PREFIX.length)
      const setting = rest.slice(0, PHPASS_SETTING_LENGTH)
      if (rest[PHPASS_SETTING_LENGTH] !== '$') return false
      const wrapped = rest.slice(PHPASS_SETTING_LENGTH + 1)
      const phpass = phpassHash(password, setting)
      if (!phpass) return false
      return await argonVerify(wrapped, phpass)
    }
    return false
  } catch {
    return false
  }
}

export function isWrappedHash(hash: string): boolean {
  return hash.startsWith(WRAPPED_PREFIX)
}
