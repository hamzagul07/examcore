/**
 * The seeded student's dashboard, derived.
 *
 * Both /demo and the locked mastery panel on /dashboard/progress need the same
 * numbers, and both must get them by running the production derivation chain
 * over `buildDemoAttempts()` rather than by holding a second copy of the
 * answers. Keeping that chain in one function is what stops the marketing tour
 * and the in-app teaser from quietly disagreeing with each other — and with the
 * real dashboard, which calls exactly these functions in exactly this order
 * (see app/dashboard/progress/page.tsx).
 */

import {
  calculateParentMastery,
  calculateSyllabusCoverage,
  flattenLeafMasteries,
  type AttemptLite,
  type LeafMastery,
  type ParentMastery,
} from '@/lib/mastery'
import { predictGrade, type GradePrediction } from '@/lib/prediction'
import { gapToTargetGrade } from '@/lib/target-grade'
import { getTotalSyllabusLeaves } from '@/lib/syllabi'
import type { NextDrill } from '@/lib/insights/types'
import {
  DEMO_STUDENT,
  DEMO_SUBJECT_CODE,
  buildDemoAttempts,
  demoMarksEarned,
  demoDaysToExam,
} from './student'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type DemoDashboard = {
  attempts: AttemptLite[]
  parentMasteries: ParentMastery[]
  masteries: LeafMastery[]
  coverage: number
  prediction: GradePrediction
  totalTopics: number
  /** Points from recent form to the target boundary; null off Cambridge scales. */
  gap: { onTrack: boolean; pointsToGo: number } | null
  daysToExam: number
  /** Weakest confidently-measured topic — what the whole route is built around. */
  weakest: LeafMastery | null
  drill: NextDrill | null
  subjectLine: string
  marksEarned: number
  weeksActive: number
  /** Sunday-report windows: this week against the one before it. */
  thisWeek: AttemptLite[]
  priorWeek: AttemptLite[]
  averageThisWeek: number | null
  averagePriorWeek: number | null
}

/** Mean percentage across a set of attempts, or null when there are none. */
function averagePercentage(rows: AttemptLite[]): number | null {
  const valid = rows.filter((a) => a.total_marks > 0)
  if (!valid.length) return null
  return (
    valid.reduce((s, a) => s + (a.marks_earned / a.total_marks) * 100, 0) /
    valid.length
  )
}

export function deriveDemoDashboard(now: Date = new Date()): DemoDashboard {
  const attempts = buildDemoAttempts(now)

  const parentMasteries = calculateParentMastery(attempts, DEMO_SUBJECT_CODE)
  const masteries = flattenLeafMasteries(parentMasteries)
  const coverage = calculateSyllabusCoverage(masteries)
  const prediction = predictGrade(attempts, masteries)
  const totalTopics = getTotalSyllabusLeaves(DEMO_SUBJECT_CODE)
  const gap = gapToTargetGrade(
    prediction.averagePercentage,
    DEMO_STUDENT.targetGrade
  )

  const weakest =
    [...masteries]
      .filter((m) => m.level === 'critical')
      .sort((a, b) => a.percentage - b.percentage)[0] ?? null

  const drill: NextDrill | null = weakest
    ? {
        kind: 'topic',
        subjectCode: DEMO_SUBJECT_CODE,
        topicCode: weakest.code,
        topicName: weakest.name,
        reason: `You are converting ${Math.round(weakest.percentage)}% of the marks available on this topic across ${weakest.attemptsCount} attempts — the lowest on your map, and the one standing between you and ${DEMO_STUDENT.targetGrade.startsWith('A') ? 'an' : 'a'} ${DEMO_STUDENT.targetGrade}.`,
      }
    : null

  const nowMs = now.getTime()
  const inWindow = (a: AttemptLite, lo: number, hi: number) => {
    const t = new Date(a.created_at).getTime()
    return t >= lo && t < hi
  }
  const thisWeek = attempts.filter((a) => inWindow(a, nowMs - WEEK_MS, nowMs + 1))
  const priorWeek = attempts.filter((a) =>
    inWindow(a, nowMs - 2 * WEEK_MS, nowMs - WEEK_MS)
  )

  return {
    attempts,
    parentMasteries,
    masteries,
    coverage,
    prediction,
    totalTopics,
    gap,
    daysToExam: demoDaysToExam(now),
    weakest,
    drill,
    subjectLine: `${DEMO_STUDENT.boardLabel} ${DEMO_SUBJECT_CODE} ${DEMO_STUDENT.subjectLabel}`,
    marksEarned: demoMarksEarned(attempts),
    weeksActive: Math.round(
      (nowMs - new Date(attempts[attempts.length - 1].created_at).getTime()) /
        WEEK_MS
    ),
    thisWeek,
    priorWeek,
    averageThisWeek: averagePercentage(thisWeek),
    averagePriorWeek: averagePercentage(priorWeek),
  }
}
