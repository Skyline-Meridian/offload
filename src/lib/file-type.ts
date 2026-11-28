export type DetectedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/avif' | 'application/pdf'

const heicBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif'])

/** Reads the first bytes of a file to find its real type, whatever the file name or declared type says. */
export function detectFileType(bytes: Uint8Array): DetectedType | null {
  const ascii = (from: number, to: number): string => String.fromCharCode(...bytes.slice(from, to))
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(0, 5) === '%PDF-') return 'application/pdf'
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
    if (heicBrands.has(brand)) return 'image/heic'
  }
  return null
}
