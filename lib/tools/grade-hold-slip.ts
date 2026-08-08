/**
 * Shareable Results Day slip — “will my grade hold?” proof for parents/tutors.
 */

export type GradeHoldSlipInput = {
  grade: string | null
  percent: number | null
  raw: number | null
  total: number | null
  nextGrade?: string | null
  marksToNext?: number | null
  subjectLabel?: string | null
  code?: string | null
  level?: string | null
}

export function buildGradeHoldSlipText(input: GradeHoldSlipInput): string {
  const score =
    input.raw != null && input.total != null
      ? `${input.raw} / ${input.total}${input.percent != null ? ` · ${input.percent}%` : ''}`
      : input.percent != null
        ? `${input.percent}%`
        : null

  const next =
    input.nextGrade && input.marksToNext != null && input.marksToNext > 0
      ? `${input.marksToNext} raw mark${input.marksToNext === 1 ? '' : 's'} to a ${input.nextGrade}`
      : null

  return [
    "MarkScheme · Will my grade hold?",
    input.subjectLabel
      ? `Subject: ${input.subjectLabel}${input.code ? ` (${input.code})` : ''}`
      : input.code
        ? `Syllabus: ${input.code}`
        : null,
    input.level ? `Level: ${input.level}` : null,
    score,
    input.grade ? `Predicted grade: ${input.grade}` : null,
    next,
    '',
    'markscheme.app/tools/will-my-grade-hold',
  ]
    .filter(Boolean)
    .join('\n')
}
