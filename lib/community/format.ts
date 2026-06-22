/** Compact Reddit-style relative time, e.g. "5m", "3h", "2d", "4mo", "1y". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo`
  return `${Math.floor(mo / 12)}y`
}

/** "1.2k" style compact counts for scores. */
export function compactCount(n: number): string {
  if (Math.abs(n) < 1000) return String(n)
  const k = n / 1000
  return `${k.toFixed(k >= 10 || Number.isInteger(k) ? 0 : 1)}k`
}
