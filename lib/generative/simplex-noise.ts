/** Lightweight 2D Simplex noise (seeded). */
export class SimplexNoise {
  private perm: Uint8Array

  constructor(seed: number) {
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    let s = seed | 0
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) | 0
      const j = ((s >>> 0) % (i + 1)) | 0
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    this.perm = new Uint8Array(512)
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    const grad = (h: number, gx: number, gy: number) => {
      const u = h < 4 ? gx : gy
      const v = h < 4 ? gy : gx
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
    }
    let n0 = 0
    let n1 = 0
    let n2 = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) {
      t0 *= t0
      n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0)
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) {
      t1 *= t1
      n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1)
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) {
      t2 *= t2
      n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2)
    }
    return 70 * (n0 + n1 + n2)
  }
}

export function hashSeed(a: string, b: string): number {
  let h = 2166136261
  const s = `${a}:${b}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
