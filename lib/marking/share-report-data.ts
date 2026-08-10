/**
 * Map a persisted attempt into the parent/tutor score-slip shape used by
 * share text, print, and the public `/r/[token]` report page.
 */

import { getSubjectByCode } from '@/lib/profile-options'
import { predictGradeFromPercentage, marksToNextGrade } from '@/lib/grade-boundaries'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { truncateMarkingPreview } from '@/lib/rich-text/truncate-marking-preview'
import type { ParentScoreSlipInput } from '@/lib/marking/parent-score-slip'

export type ShareAttemptRow = {
  id: string
  marks_earned: number | null
  total_marks: number | null
  question_text: string | null
  syllabus_tags: string[] | null
  ai_marking: {
    marks_awarded?: Array<{
      type?: string
      earned?: boolean
      reasoning?: string
      mark_id?: number | string
    }>
    weak_topics?: string[]
    summary?: string
    marking_style?: string
  } | null
  source_type?: string | null
}

function bandLabel(pct: number, earned: number, total: number): string {
  if (total > 0 && earned >= total) return 'Full marks'
  if (pct >= 80) return 'Strong'
  if (pct >= 50) return 'Nearly there'
  return 'Room to grow'
}

export function buildShareReportFromAttempt(
  attempt: ShareAttemptRow,
  opts?: { subjectCode?: string | null; paperRef?: string | null }
): ParentScoreSlipInput | null {
  const earned = Number(attempt.marks_earned)
  const total = Number(attempt.total_marks)
  if (!Number.isFinite(earned) || !Number.isFinite(total) || total <= 0) {
    return null
  }

  const percentage = Math.round((earned / total) * 100)
  const subjectCode = opts?.subjectCode ?? null
  const isIb = subjectCode ? isIbSubjectCode(subjectCode) : false
  const grade = !isIb
    ? predictGradeFromPercentage(percentage)?.grade ?? null
    : null
  const nextGrade = !isIb ? marksToNextGrade(earned, total) : null

  const awards = attempt.ai_marking?.marks_awarded ?? []
  const marks = awards.map((m, i) => ({
    label: m.type?.trim() || `Mark ${i + 1}`,
    earned: !!m.earned,
    reason: m.earned
      ? null
      : truncateMarkingPreview(m.reasoning || '', 140, '') || null,
  }))

  const topics = [
    ...(attempt.ai_marking?.weak_topics ?? []),
    ...(attempt.syllabus_tags ?? []).map(String),
  ]
    .filter(Boolean)
    .slice(0, 6)

  const subjectLabel = subjectCode
    ? getSubjectByCode(subjectCode)?.label ?? subjectCode
    : null

  return {
    marksEarned: earned,
    totalMarks: total,
    percentage,
    bandLabel: bandLabel(percentage, earned, total),
    grade,
    nextGrade,
    subjectLabel,
    paperRef: opts?.paperRef ?? null,
    topics,
    marks,
    summary: attempt.ai_marking?.summary?.trim() || null,
  }
}
