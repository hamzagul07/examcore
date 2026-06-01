/**
 * Leaf-level mastery with minimum-attempts threshold; parents aggregate leaves.
 * Used by Mastery Matrix, Coverage, Grade Trajectory, and Action Plan.
 */

import {
  getSyllabusTree,
  type SyllabusLeaf,
  type SyllabusParent,
} from './syllabi'
import type { SyllabusCode } from './syllabus'
import type { ErrorClassificationDetail } from './error-classifications'

export interface AttemptLite {
  id: string
  marks_earned: number
  total_marks: number
  syllabus_tags: SyllabusCode[] | null
  created_at: string
  time_spent_seconds?: number | null
  question_text?: string | null
  source_type?: string | null
  /** Per-mark error labels from the marking pipeline; powers the Patterns panel. */
  error_classifications?: ErrorClassificationDetail[] | null
}

export type MasteryLevel =
  | 'unattempted'
  | 'sampled'
  | 'critical'
  | 'proficient'
  | 'exam_ready'

export interface LeafMastery {
  code: string
  name: string
  paper: string
  paperName: string
  parent: { code: string; name: string }
  level: MasteryLevel
  percentage: number
  attemptsCount: number
  totalMarksEarned: number
  totalMarksAvailable: number
}

export interface ParentMastery {
  code: string
  name: string
  paper: string
  paperName: string
  leaves: LeafMastery[]
  level: MasteryLevel
  leafCounts: {
    unattempted: number
    sampled: number
    critical: number
    proficient: number
    exam_ready: number
  }
  averagePercentage: number | null
}

/** @deprecated Use LeafMastery — kept for gradual migration */
export type TopicMastery = LeafMastery

export const MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY = 3
const CRITICAL_THRESHOLD = 40
const PROFICIENT_THRESHOLD = 75

function percentageFromAttempts(tagged: AttemptLite[]): number {
  const earned = tagged.reduce((sum, a) => sum + (a.marks_earned || 0), 0)
  const available = tagged.reduce((sum, a) => sum + (a.total_marks || 0), 0)
  return available > 0 ? (earned / available) * 100 : 0
}

function levelFromPercentage(
  pct: number,
  attemptsCount: number
): MasteryLevel {
  if (attemptsCount === 0) return 'unattempted'
  if (attemptsCount < MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY) return 'sampled'
  if (pct < CRITICAL_THRESHOLD) return 'critical'
  if (pct < PROFICIENT_THRESHOLD) return 'proficient'
  return 'exam_ready'
}

export function calculateLeafMastery(
  leaf: SyllabusLeaf,
  parent: SyllabusParent,
  attempts: AttemptLite[]
): LeafMastery {
  const tagged = attempts.filter((a) =>
    (a.syllabus_tags || []).includes(leaf.code)
  )

  if (tagged.length === 0) {
    return {
      code: leaf.code,
      name: leaf.name,
      paper: leaf.paper,
      paperName: leaf.paperName,
      parent: { code: parent.code, name: parent.name },
      level: 'unattempted',
      percentage: 0,
      attemptsCount: 0,
      totalMarksEarned: 0,
      totalMarksAvailable: 0,
    }
  }

  const earned = tagged.reduce((sum, a) => sum + (a.marks_earned || 0), 0)
  const available = tagged.reduce((sum, a) => sum + (a.total_marks || 0), 0)
  const percentage = percentageFromAttempts(tagged)
  const level = levelFromPercentage(percentage, tagged.length)

  return {
    code: leaf.code,
    name: leaf.name,
    paper: leaf.paper,
    paperName: leaf.paperName,
    parent: { code: parent.code, name: parent.name },
    level,
    percentage,
    attemptsCount: tagged.length,
    totalMarksEarned: earned,
    totalMarksAvailable: available,
  }
}

export function aggregateParentMastery(
  parent: SyllabusParent,
  leafMasteries: LeafMastery[]
): ParentMastery {
  const leafCounts = {
    unattempted: 0,
    sampled: 0,
    critical: 0,
    proficient: 0,
    exam_ready: 0,
  }
  for (const l of leafMasteries) leafCounts[l.level] += 1

  const attempted = leafMasteries.filter((l) => l.attemptsCount > 0)
  const averagePercentage =
    attempted.length > 0
      ? attempted.reduce((s, l) => s + l.percentage, 0) / attempted.length
      : null

  let level: MasteryLevel = 'unattempted'
  if (leafMasteries.length === 0) {
    level = 'unattempted'
  } else if (leafCounts.unattempted === leafMasteries.length) {
    level = 'unattempted'
  } else if (leafCounts.critical > 0) {
    level = 'critical'
  } else if (leafCounts.exam_ready === leafMasteries.length) {
    level = 'exam_ready'
  } else if (
    leafCounts.sampled > 0 &&
    leafCounts.critical === 0 &&
    leafCounts.proficient === 0 &&
    leafCounts.exam_ready === 0
  ) {
    level = 'sampled'
  } else if (
    (averagePercentage ?? 0) >= PROFICIENT_THRESHOLD &&
    leafCounts.critical === 0
  ) {
    level = 'proficient'
  } else if (
    (averagePercentage ?? 0) >= CRITICAL_THRESHOLD &&
    leafCounts.critical === 0
  ) {
    level = 'proficient'
  } else if (leafCounts.sampled > 0) {
    level = 'sampled'
  }

  return {
    code: parent.code,
    name: parent.name,
    paper: parent.paper,
    paperName: parent.paperName,
    leaves: leafMasteries,
    level,
    leafCounts,
    averagePercentage,
  }
}

export function calculateParentMastery(
  attempts: AttemptLite[],
  subjectCode: string
): ParentMastery[] {
  const tree = getSyllabusTree(subjectCode)
  if (!tree?.length) return []

  return tree.map(({ parent, leaves }) => {
    const leafMasteries = leaves.map((leaf) =>
      calculateLeafMastery(leaf, parent, attempts)
    )
    return aggregateParentMastery(parent, leafMasteries)
  })
}

export function flattenLeafMasteries(
  parents: ParentMastery[]
): LeafMastery[] {
  return parents.flatMap((p) => p.leaves)
}

/**
 * Flat leaf list — backward-compatible entry for coverage / legacy callers.
 */
export function calculateMastery(
  attempts: AttemptLite[],
  subjectCode: string
): LeafMastery[] {
  return flattenLeafMasteries(calculateParentMastery(attempts, subjectCode))
}

export function calculateSyllabusCoverage(masteries: LeafMastery[]): number {
  if (masteries.length === 0) return 0
  const masteredCount = masteries.filter(
    (m) => m.level === 'proficient' || m.level === 'exam_ready'
  ).length
  return (masteredCount / masteries.length) * 100
}

export interface MasteryCounts {
  critical: number
  proficient: number
  exam_ready: number
  unattempted: number
  sampled: number
}

export function countMasteries(masteries: LeafMastery[]): MasteryCounts {
  const counts: MasteryCounts = {
    critical: 0,
    proficient: 0,
    exam_ready: 0,
    unattempted: 0,
    sampled: 0,
  }
  for (const m of masteries) counts[m.level] += 1
  return counts
}

export const MASTERY_STYLES: Record<
  MasteryLevel,
  { pill: string; dot: string; label: string }
> = {
  unattempted: {
    pill: 'ec-tint-neutral-chip',
    dot: 'bg-[var(--ec-chip-neutral-text)]',
    label: 'Unattempted',
  },
  sampled: {
    pill: 'ec-tint-sampled-chip',
    dot: 'bg-[var(--ec-chip-sampled-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-sampled-text)_50%,transparent)]',
    label: 'Sampled',
  },
  critical: {
    pill: 'ec-tint-critical-chip',
    dot: 'bg-[var(--ec-chip-critical-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-critical-text)_60%,transparent)]',
    label: 'Critical',
  },
  proficient: {
    pill: 'ec-tint-warning-chip',
    dot: 'bg-[var(--ec-chip-warning-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-warning-text)_60%,transparent)]',
    label: 'Proficient',
  },
  exam_ready: {
    pill: 'ec-tint-success-chip',
    dot: 'bg-[var(--ec-chip-success-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-success-text)_60%,transparent)]',
    label: 'Exam Ready',
  },
}

export function formatParentLeafBreakdown(
  leafCounts: ParentMastery['leafCounts']
): string {
  const parts: string[] = []
  if (leafCounts.exam_ready)
    parts.push(`${leafCounts.exam_ready} Exam Ready`)
  if (leafCounts.proficient) parts.push(`${leafCounts.proficient} Proficient`)
  if (leafCounts.sampled) parts.push(`${leafCounts.sampled} Sampled`)
  if (leafCounts.critical) parts.push(`${leafCounts.critical} Critical`)
  if (leafCounts.unattempted)
    parts.push(`${leafCounts.unattempted} Unattempted`)
  return parts.join(' · ') || 'No leaves'
}
