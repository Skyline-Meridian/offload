import { createHash } from 'node:crypto'

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function md5(data: Buffer): Buffer {
  return createHash('md5').update(data).digest()
}

function encode64(input: Buffer, count: number): string {
  let output = ''
  let i = 0
  do {
    let value = input[i++]!
    output += ITOA64[value & 0x3f]
    if (i < count) value |= input[i]! << 8
    output += ITOA64[(value >> 6) & 0x3f]
    if (i++ >= count) break
    if (i < count) value |= input[i]! << 16
    output += ITOA64[(value >> 12) & 0x3f]
    if (i++ >= count) break
    output += ITOA64[(value >> 18) & 0x3f]
  } while (i < count)
  return output
}

/** The first 12 characters of a phpass hash: "$P$", the cost character and 8 characters of salt. */
export const PHPASS_SETTING_LENGTH = 12

/**
 * Computes a portable PHP password hash (phpass) of `password`, using the 12 character `setting`
 * of an existing hash. Returns the full 34 character hash, or null when the setting is not valid.
 */
export function phpassHash(password: string, setting: string): string | null {
  if (setting.length < PHPASS_SETTING_LENGTH) return null
  if (!setting.startsWith('$P$') && !setting.startsWith('$H$')) return null
  const countLog2 = ITOA64.indexOf(setting[3]!)
  if (countLog2 < 7 || countLog2 > 30) return null
  let count = 2 ** countLog2
  const salt = setting.slice(4, 12)
  if (salt.length !== 8) return null

  const pw = Buffer.from(password, 'utf8')
  let hash = md5(Buffer.concat([Buffer.from(salt, 'utf8'), pw]))
  do {
    hash = md5(Buffer.concat([hash, pw]))
  } while (--count)

  return setting.slice(0, PHPASS_SETTING_LENGTH) + encode64(hash, 16)
}
