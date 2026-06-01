type AttemptLike = {
  created_at: string
  marks_earned: number
  total_marks: number
  mark_schemes?:
    | { paper_code?: string | null }
    | { paper_code?: string | null }[]
    | null
}

function paperCodeFromAttempt(a: AttemptLike): string | null {
  const ms = a.mark_schemes
  if (!ms) return null
  const row = Array.isArray(ms) ? ms[0] : ms
  return row?.paper_code?.split('/')[0] ?? null
}

export function attemptsThisWeek(timestamps: Date[]): number {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  return timestamps.filter((d) => d >= weekAgo).length
}

export function attemptsThisMonth(timestamps: Date[]): number {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return timestamps.filter((d) => d >= monthStart).length
}

/** Best subject by average score this week (min 1 attempt). */
export function bestSubjectThisWeek(attempts: AttemptLike[]): string | null {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)

  const bySubject = new Map<string, { sum: number; count: number }>()

  for (const a of attempts) {
    const d = new Date(a.created_at)
    if (d < weekAgo) continue
    const code = paperCodeFromAttempt(a)
    if (!code) continue
    const pct = a.total_marks > 0 ? (a.marks_earned / a.total_marks) * 100 : 0
    const cur = bySubject.get(code) ?? { sum: 0, count: 0 }
    cur.sum += pct
    cur.count += 1
    bySubject.set(code, cur)
  }

  let best: { code: string; avg: number } | null = null
  for (const [code, { sum, count }] of bySubject) {
    const avg = sum / count
    if (!best || avg > best.avg) best = { code, avg }
  }
  return best?.code ?? null
}

export function uniqueSubjectCodes(attempts: AttemptLike[]): string[] {
  const codes = new Set<string>()
  for (const a of attempts) {
    const code = paperCodeFromAttempt(a)
    if (code) codes.add(code)
  }
  return Array.from(codes)
}
