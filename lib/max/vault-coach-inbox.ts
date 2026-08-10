/**
 * Recompute Max weekly coach snapshots for the Vault inbox.
 * Reports are not stored — we reconstruct windows from attempt history.
 */
import 'server-only'

import {
  computeWeeklyReportData,
} from '@/lib/reports/weekly-report'
import type { WeeklyReportData } from '@/lib/email/weekly-report'
import type { AttemptWithPaper } from '@/lib/syllabi/attempts'

export type VaultCoachWeek = {
  /** Monday UTC of that week window end (display label). */
  weekLabel: string
  /** Human label e.g. "This week" / "Last week". */
  title: string
  data: WeeklyReportData
}

function mondayUtcLabel(d: Date): string {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - day + 1)
  return start.toISOString().slice(0, 10)
}

/**
 * Build last `weeks` coach snapshots ending at `asOf` (default now).
 * Skips empty weeks with zero marks unless it's the current week.
 */
export function buildVaultCoachInbox(opts: {
  attempts: AttemptWithPaper[]
  targetGrade: string | null
  examDate: string | null
  weeks?: number
  asOf?: Date
}): VaultCoachWeek[] {
  const weeks = opts.weeks ?? 4
  const asOf = opts.asOf ?? new Date()
  const profile = { target_grade: opts.targetGrade, exam_date: opts.examDate }
  const out: VaultCoachWeek[] = []

  for (let i = 0; i < weeks; i++) {
    const end = new Date(asOf.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const data = computeWeeklyReportData(opts.attempts, profile, { asOf: end })
    if (i > 0 && data.marksThisWeek === 0) continue
    const titles = ['This week', 'Last week', '2 weeks ago', '3 weeks ago']
    out.push({
      weekLabel: mondayUtcLabel(end),
      title: titles[i] ?? `${i} weeks ago`,
      data,
    })
  }

  return out
}
