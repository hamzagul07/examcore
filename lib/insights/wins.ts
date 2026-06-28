/**
 * Wins = milestones the student genuinely reached. Every entry is backed by a
 * real attempt or a real mastery transition — there are no participation
 * trophies and no fabricated "great job!" moments here.
 */

import type { AttemptLite, LeafMastery } from '@/lib/mastery'
import { predictGradeFromPercentage } from '@/lib/grade-boundaries'
import type { Win } from './types'

const COVERAGE_TIERS = [25, 10, 5]

function pct(a: AttemptLite): number {
  return a.total_marks > 0 ? (a.marks_earned / a.total_marks) * 100 : 0
}

/**
 * @param attempts newest-first (as fetched by the page)
 * @param masteries flattened leaf masteries for the selected subject
 * @param streak current consecutive-day streak
 */
export function deriveWins(
  attempts: AttemptLite[],
  masteries: LeafMastery[],
  streak: number,
  /** IB is graded 1–7, not Cambridge A*–E — skip Cambridge grade-up wins. */
  isIb = false
): Win[] {
  if (attempts.length === 0) return []

  const wins: Win[] = []
  const oldestFirst = [...attempts].reverse()

  // First mark — where the journey started.
  const first = oldestFirst[0]
  wins.push({
    kind: 'first_mark',
    title: 'Started marking',
    detail: 'Your first question, logged and analysed.',
    date: first.created_at,
  })

  // Personal best / perfect score.
  let best = attempts[0]
  for (const a of attempts) if (pct(a) > pct(best)) best = a
  const bestPct = Math.round(pct(best))
  if (bestPct >= 100) {
    wins.push({
      kind: 'perfect_score',
      title: 'Full marks',
      detail: `${best.marks_earned}/${best.total_marks} — every available mark.`,
      date: best.created_at,
    })
  } else if (bestPct > 0) {
    wins.push({
      kind: 'personal_best',
      title: 'Personal best',
      detail: `${best.marks_earned}/${best.total_marks} (${bestPct}%) — your highest yet.`,
      date: best.created_at,
    })
  }

  // Exam-ready topics — confirmed mastery, not a guess.
  const examReady = masteries.filter((m) => m.level === 'exam_ready')
  if (examReady.length > 0) {
    const latest = examReadyDate(examReady, attempts)
    wins.push({
      kind: 'exam_ready',
      title:
        examReady.length === 1
          ? '1 topic at Exam Ready'
          : `${examReady.length} topics at Exam Ready`,
      detail:
        examReady.length === 1
          ? `${examReady[0].name} is holding above 75%.`
          : 'Consistently scoring 75%+ on these specification points.',
      date: latest,
    })
  }

  // Coverage milestones — breadth of the syllabus touched.
  const topicsTouched = new Set<string>()
  for (const a of attempts) for (const t of a.syllabus_tags || []) topicsTouched.add(t)
  const touchedCount = topicsTouched.size
  const tier = COVERAGE_TIERS.find((t) => touchedCount >= t)
  if (tier) {
    wins.push({
      kind: 'coverage',
      title: `${tier}+ topics explored`,
      detail: `You've put real work across ${touchedCount} specification points.`,
      date: attempts[0].created_at,
    })
  }

  // Grade-up — only when the recent window genuinely beats the early window.
  const gradeUp = isIb ? null : detectGradeUp(oldestFirst)
  if (gradeUp) {
    wins.push({
      kind: 'grade_up',
      title: `Trajectory rose to ${gradeUp.to}`,
      detail: `Your rolling grade moved from ${gradeUp.from} to ${gradeUp.to}.`,
      date: attempts[0].created_at,
    })
  }

  // Streak — habit, when it's real.
  if (streak >= 3) {
    wins.push({
      kind: 'streak',
      title: `${streak}-day streak`,
      detail: 'Consecutive days with at least one marked question.',
      date: attempts[0].created_at,
    })
  }

  return wins
}

function examReadyDate(
  examReady: LeafMastery[],
  attempts: AttemptLite[]
): string {
  const codes = new Set(examReady.map((m) => m.code))
  for (const a of attempts) {
    if ((a.syllabus_tags || []).some((t) => codes.has(t))) return a.created_at
  }
  return attempts[0]?.created_at ?? new Date().toISOString()
}

function detectGradeUp(
  oldestFirst: AttemptLite[]
): { from: string; to: string } | null {
  if (oldestFirst.length < 6) return null
  const half = Math.floor(oldestFirst.length / 2)
  const early = oldestFirst.slice(0, half)
  const recent = oldestFirst.slice(-Math.min(half, 5))
  const avg = (arr: AttemptLite[]) =>
    arr.reduce((s, a) => s + pct(a), 0) / arr.length
  const fromGrade = predictGradeFromPercentage(avg(early)).grade
  const toGrade = predictGradeFromPercentage(avg(recent)).grade
  if (fromGrade === toGrade) return null
  // Only celebrate genuine improvement (lower index in boundary order = better).
  return gradeRank(toGrade) < gradeRank(fromGrade)
    ? { from: fromGrade, to: toGrade }
    : null
}

const GRADE_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E', 'U']
function gradeRank(g: string): number {
  const i = GRADE_ORDER.indexOf(g)
  return i === -1 ? GRADE_ORDER.length : i
}
