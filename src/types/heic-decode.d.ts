declare module 'heic-decode' {
  type Decoded = { width: number; height: number; data: Uint8ClampedArray | Buffer }
  export default function decode(options: { buffer: Buffer | Uint8Array }): Promise<Decoded>
}
