import type { WeakLessonAuditReport } from './weak-lesson-audit'

/** Failures Job 3 LLM regeneration can address. */
export const REGENERATION_FIXABLE_CODES = new Set([
  'min_worked_examples',
  'hollow_worked_example',
  'no_substantive_worked_example',
  'missing_numeric_worked_example',
  'min_flashcards',
  'low_coverage_score',
])

/** Unsafe/corrupted KaTeX — manual or dedicated tooling, not LLM regeneration. */
export const MANUAL_KATEX_CODE = 'katex_parse_error'

/** Resolved by deterministic visual-consolidation, not LLM. */
export const VISUAL_CONSOLIDATION_CODE = 'multiple_visuals'

export type FailureRoute =
  | 'regeneration'
  | 'visual_consolidation'
  | 'manual_katex'
  | 'other'

export type LessonFailureClassification = {
  filePath: string
  subjectCode: string
  topicCode: string
  issueCodes: string[]
  route: FailureRoute
}

export function classifyLessonFailure(issueCodes: string[]): FailureRoute {
  if (!issueCodes.length) return 'other'
  if (issueCodes.every((c) => REGENERATION_FIXABLE_CODES.has(c))) return 'regeneration'
  if (
    issueCodes.length === 1 &&
    issueCodes[0] === VISUAL_CONSOLIDATION_CODE
  ) {
    return 'visual_consolidation'
  }
  if (issueCodes.some((c) => c === MANUAL_KATEX_CODE)) return 'manual_katex'
  if (
    issueCodes.every(
      (c) =>
        REGENERATION_FIXABLE_CODES.has(c) || c === VISUAL_CONSOLIDATION_CODE
    )
  ) {
    return 'visual_consolidation'
  }
  return 'other'
}

export type FailureSplitReport = {
  totalFailed: number
  regenerationEligible: number
  visualConsolidation: number
  manualKatex: number
  other: number
  bySubject: Record<
    string,
    { regeneration: number; visual: number; katex: number; other: number }
  >
  regenerationPaths: string[]
  visualPaths: string[]
  manualKatexPaths: string[]
  otherPaths: string[]
}

export function analyzeFailureSplit(
  auditReport: WeakLessonAuditReport
): FailureSplitReport {
  const bySubject: FailureSplitReport['bySubject'] = {}
  const regenerationPaths: string[] = []
  const visualPaths: string[] = []
  const manualKatexPaths: string[] = []
  const otherPaths: string[] = []

  let regenerationEligible = 0
  let visualConsolidation = 0
  let manualKatex = 0
  let other = 0

  for (const subj of auditReport.subjects) {
    if (!bySubject[subj.subjectCode]) {
      bySubject[subj.subjectCode] = { regeneration: 0, visual: 0, katex: 0, other: 0 }
    }
    for (const f of subj.failures) {
      const route = classifyLessonFailure(f.issueCodes)
      switch (route) {
        case 'regeneration':
          regenerationEligible += 1
          bySubject[subj.subjectCode].regeneration += 1
          regenerationPaths.push(f.filePath)
          break
        case 'visual_consolidation':
          visualConsolidation += 1
          bySubject[subj.subjectCode].visual += 1
          visualPaths.push(f.filePath)
          break
        case 'manual_katex':
          manualKatex += 1
          bySubject[subj.subjectCode].katex += 1
          manualKatexPaths.push(f.filePath)
          break
        default:
          other += 1
          bySubject[subj.subjectCode].other += 1
          otherPaths.push(f.filePath)
      }
    }
  }

  return {
    totalFailed: auditReport.totalFailed,
    regenerationEligible,
    visualConsolidation,
    manualKatex,
    other,
    bySubject,
    regenerationPaths,
    visualPaths,
    manualKatexPaths,
    otherPaths,
  }
}

export function regenerationEligiblePathsFromAudit(
  auditReport: WeakLessonAuditReport,
  opts: { subjectCode?: string } = {}
): string[] {
  const split = analyzeFailureSplit(auditReport)
  let paths = split.regenerationPaths
  if (opts.subjectCode) {
    const prefix = `content/courses/${opts.subjectCode}/`
    paths = paths.filter((p) => p.startsWith(prefix))
  }
  return paths
}

export function formatFailureSplitReport(split: FailureSplitReport): string {
  const lines: string[] = []
  lines.push('JOB 3 FAILURE SPLIT (558 remaining after Jobs 1–2)')
  lines.push('')
  lines.push(`Total failing lessons:     ${split.totalFailed}`)
  lines.push(`Regeneration-eligible:     ${split.regenerationEligible}  (Job 3 LLM)`)
  lines.push(`Visual consolidation:    ${split.visualConsolidation}  (deterministic, pre-Job 3)`)
  lines.push(`Manual KaTeX (flagged):  ${split.manualKatex}`)
  lines.push(`Other (flagged):         ${split.other}`)
  lines.push('')
  lines.push('Per-subject regeneration-eligible (top):')
  const ranked = Object.entries(split.bySubject)
    .filter(([, v]) => v.regeneration > 0)
    .sort((a, b) => b[1].regeneration - a[1].regeneration)
    .slice(0, 12)
  for (const [code, v] of ranked) {
    lines.push(`  ${code}: ${v.regeneration} regen | ${v.visual} visual | ${v.katex} katex | ${v.other} other`)
  }
  return lines.join('\n')
}
