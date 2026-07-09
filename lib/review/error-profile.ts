import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import {
  ERROR_LABELS,
  type ErrorClassification,
  type ErrorClassificationDetail,
} from '@/lib/error-classifications'

export type ErrorProfileEntry = {
  classification: ErrorClassification
  label: string
  icon: string
  description: string
  count: number
  pct: number
}

export type MarkTypeShare = { code: 'M' | 'A' | 'B'; label: string; pct: number }

export type ErrorProfile = {
  totalErrors: number
  top: ErrorProfileEntry | null
  breakdown: ErrorProfileEntry[]
  topMarkType: MarkTypeShare | null
}

/** Need enough signal before telling a student "this is your pattern". */
const MIN_ERRORS_FOR_PROFILE = 5

const MARK_TYPE_LABEL: Record<'M' | 'A' | 'B', string> = {
  M: 'method (M)',
  A: 'accuracy (A)',
  B: 'knowledge (B)',
}

const EMPTY: ErrorProfile = { totalErrors: 0, top: null, breakdown: [], topMarkType: null }

/**
 * Aggregates the classified errors across a student's marked attempts into a
 * "how you lose marks" profile — the dominant error type (why) and the mark
 * type it most often hits (where). Powered by the marking engine's
 * `error_classifications`; server-only.
 */
export async function getErrorProfile(userId: string): Promise<ErrorProfile> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('attempts')
    .select('error_classifications')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300)

  const rows = (data ?? []) as {
    error_classifications: ErrorClassificationDetail[] | null
  }[]

  const byClass = new Map<ErrorClassification, number>()
  const byMark = new Map<'M' | 'A' | 'B', number>()
  let totalErrors = 0

  for (const r of rows) {
    const errs = r.error_classifications
    if (!Array.isArray(errs)) continue
    for (const e of errs) {
      const c = e?.classification
      if (!c || c === 'no_error' || !(c in ERROR_LABELS)) continue
      totalErrors++
      byClass.set(c, (byClass.get(c) ?? 0) + 1)
      // First letter of the mark code → type. Cambridge DM (dependent method)
      // counts as method.
      let mt = e.mark_id?.[0]?.toUpperCase()
      if (mt === 'D') mt = 'M'
      if (mt === 'M' || mt === 'A' || mt === 'B') {
        byMark.set(mt, (byMark.get(mt) ?? 0) + 1)
      }
    }
  }

  if (totalErrors < MIN_ERRORS_FOR_PROFILE) return EMPTY

  const breakdown: ErrorProfileEntry[] = [...byClass.entries()]
    .map(([classification, count]) => ({
      classification,
      label: ERROR_LABELS[classification].label,
      icon: ERROR_LABELS[classification].icon,
      description: ERROR_LABELS[classification].description,
      count,
      pct: Math.round((count / totalErrors) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  const markEntries = [...byMark.entries()].sort((a, b) => b[1] - a[1])
  const markTotal = markEntries.reduce((s, [, n]) => s + n, 0)
  const topMarkType: MarkTypeShare | null =
    markEntries.length && markTotal
      ? {
          code: markEntries[0][0],
          label: MARK_TYPE_LABEL[markEntries[0][0]],
          pct: Math.round((markEntries[0][1] / markTotal) * 100),
        }
      : null

  return { totalErrors, top: breakdown[0] ?? null, breakdown: breakdown.slice(0, 4), topMarkType }
}
