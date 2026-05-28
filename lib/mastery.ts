/**
 * Mastery model: roll attempts into a per-topic "how strong is the student on
 * this?" view. Used by the Mastery Matrix, Coverage card, Grade Trajectory
 * prediction, and Action Plan generation.
 *
 * Thresholds were picked to feel honest:
 *   - Critical (<40%): clearly losing marks; needs intervention.
 *   - Proficient (40-74%): can solve, but not yet exam-tight.
 *   - Exam Ready (75%+): consistently scoring at A/A* level on this topic.
 *
 * An "unattempted" topic is distinct from "0%" — we want to render those in a
 * neutral gray, not red, so the matrix doesn't look like a wall of failure on
 * day one.
 */

import {
  CAMBRIDGE_9709_SYLLABUS,
  type SyllabusCode,
  type SyllabusPaper,
} from './syllabus'

/**
 * Minimal Attempt shape that all `lib/` helpers depend on. Mirrors the columns
 * we select on the server; we intentionally don't pull in a generated Supabase
 * type to keep this file framework-agnostic and easy to unit-test.
 */
export interface AttemptLite {
  id: string
  marks_earned: number
  total_marks: number
  syllabus_tags: SyllabusCode[] | null
  created_at: string
  time_spent_seconds?: number | null
  question_text?: string | null
  source_type?: string | null
}

export type MasteryLevel =
  | 'unattempted'
  | 'critical'
  | 'proficient'
  | 'exam_ready'

export interface TopicMastery {
  code: SyllabusCode
  name: string
  paper: SyllabusPaper
  paperName: string
  level: MasteryLevel
  /** 0-100. Zero when unattempted (use `level` to distinguish). */
  percentage: number
  attemptsCount: number
  totalMarksEarned: number
  totalMarksAvailable: number
}

const CRITICAL_THRESHOLD = 40
const PROFICIENT_THRESHOLD = 75

export function calculateMastery(attempts: AttemptLite[]): TopicMastery[] {
  return CAMBRIDGE_9709_SYLLABUS.map((topic): TopicMastery => {
    const taggedAttempts = attempts.filter((a) =>
      (a.syllabus_tags || []).includes(topic.code)
    )

    if (taggedAttempts.length === 0) {
      return {
        code: topic.code,
        name: topic.name,
        paper: topic.paper,
        paperName: topic.paperName,
        level: 'unattempted',
        percentage: 0,
        attemptsCount: 0,
        totalMarksEarned: 0,
        totalMarksAvailable: 0,
      }
    }

    const earned = taggedAttempts.reduce(
      (sum, a) => sum + (a.marks_earned || 0),
      0
    )
    const available = taggedAttempts.reduce(
      (sum, a) => sum + (a.total_marks || 0),
      0
    )
    const percentage = available > 0 ? (earned / available) * 100 : 0

    let level: MasteryLevel
    if (percentage < CRITICAL_THRESHOLD) level = 'critical'
    else if (percentage < PROFICIENT_THRESHOLD) level = 'proficient'
    else level = 'exam_ready'

    return {
      code: topic.code,
      name: topic.name,
      paper: topic.paper,
      paperName: topic.paperName,
      level,
      percentage,
      attemptsCount: taggedAttempts.length,
      totalMarksEarned: earned,
      totalMarksAvailable: available,
    }
  })
}

/**
 * Coverage = share of the syllabus the student is at least "proficient" on.
 * We deliberately exclude "critical" topics here — they've been touched but
 * aren't yet mastered, so they don't count toward syllabus coverage.
 */
export function calculateSyllabusCoverage(masteries: TopicMastery[]): number {
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
}

export function countMasteries(masteries: TopicMastery[]): MasteryCounts {
  const counts: MasteryCounts = {
    critical: 0,
    proficient: 0,
    exam_ready: 0,
    unattempted: 0,
  }
  for (const m of masteries) counts[m.level] += 1
  return counts
}

/** Tailwind class bundles per mastery level — single source of truth.
 *  Sprint 21 refinement: brighter foreground text (-300 vs -400), softer
 *  borders (-800/70 vs -900), and translucent backgrounds (/60) so the pills
 *  feel like glass on the dark surface rather than solid blocks. */
export const MASTERY_STYLES: Record<
  MasteryLevel,
  { pill: string; dot: string; label: string }
> = {
  unattempted: {
    pill: 'bg-slate-800/50 text-slate-400 border-slate-700',
    dot: 'bg-slate-500',
    label: 'Unattempted',
  },
  critical: {
    pill: 'bg-red-950/60 text-red-300 border-red-800/70',
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    label: 'Critical',
  },
  proficient: {
    pill: 'bg-amber-950/60 text-amber-300 border-amber-800/70',
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    label: 'Proficient',
  },
  exam_ready: {
    pill: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70',
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    label: 'Exam Ready',
  },
}
