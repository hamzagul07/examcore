/**
 * Grade prediction = "if exam day were today, what would you walk out with?"
 *
 * We use a recent-attempts average (last 10) rather than lifetime average to
 * weight current form over ancient mistakes. Confidence is a function of
 * sample size: a single 80% attempt is interesting but not yet reliable.
 */

import {
  predictGradeFromPercentage,
  getNextGrade,
  type GradeBoundary,
} from './grade-boundaries'
import type { AttemptLite, TopicMastery } from './mastery'

export interface GradePrediction {
  /** 'A*' through 'U', or '—' before any attempts exist. */
  predictedGrade: GradeBoundary['grade'] | '—'
  /** 0-100. Caps at 95 — never claim certainty on a stochastic forecast. */
  confidence: number
  /** Sentence to render below the big letter. Always present (empty-state copy when needed). */
  nextLevelTip: string
  /** Hex color for the predicted grade card accent. */
  color: string
  /** Rolling average that produced this prediction (0-100), null if unknown. */
  averagePercentage: number | null
}

const RECENT_WINDOW = 10

export function predictGrade(
  attempts: AttemptLite[],
  masteries: TopicMastery[]
): GradePrediction {
  if (attempts.length === 0) {
    return {
      predictedGrade: '—',
      confidence: 0,
      nextLevelTip: 'Mark 3-5 questions and your predicted grade will appear here.',
      color: '#94a3b8',
      averagePercentage: null,
    }
  }

  // Caller passes attempts sorted newest-first; slice picks the most recent.
  const recent = attempts.slice(0, RECENT_WINDOW)
  const avgPct =
    recent.reduce((sum, a) => {
      if (!a.total_marks) return sum
      return sum + (a.marks_earned / a.total_marks) * 100
    }, 0) / recent.length

  const predicted = predictGradeFromPercentage(avgPct)

  // Confidence model: 30% floor at 1 attempt, +7 per additional attempt, hard
  // cap at 95. We never want to show "100% chance" because exams aren't.
  const confidence = Math.min(95, 30 + recent.length * 7)

  // Tip strategy (Sprint 21 risk-mapping wording):
  //   1. Pick the worst Critical topic — biggest payoff to fix. Wording:
  //      "Converting <name> (<code>) to Exam Ready will shift your projection
  //      to <next grade>."
  //   2. Fallback to Proficient topics that haven't reached Exam Ready yet.
  //   3. Fallback to encouragement when everything is already Exam Ready.
  const criticalTopics = [...masteries]
    .filter((m) => m.level === 'critical')
    .sort((a, b) => a.percentage - b.percentage)

  const proficientTopics = [...masteries]
    .filter((m) => m.level === 'proficient')
    .sort((a, b) => a.percentage - b.percentage)

  const nextGrade = getNextGrade(predicted.grade)
  let nextLevelTip: string
  if (criticalTopics.length > 0 && nextGrade) {
    const t = criticalTopics[0]
    nextLevelTip = `Converting ${t.name} (${t.code}) to Exam Ready will shift your projection to ${nextGrade}.`
  } else if (criticalTopics.length > 0) {
    const t = criticalTopics[0]
    nextLevelTip = `Converting ${t.name} (${t.code}) to Exam Ready will lock in your A*.`
  } else if (proficientTopics.length > 0 && nextGrade) {
    const t = proficientTopics[0]
    nextLevelTip = `Converting ${t.name} (${t.code}) to Exam Ready will shift your projection to ${nextGrade}.`
  } else if (predicted.grade === 'A*') {
    nextLevelTip = 'You\u2019re tracking at A*. Keep marking to stay sharp.'
  } else {
    nextLevelTip = 'Solid form. Mark a few more questions to firm up the prediction.'
  }

  return {
    predictedGrade: predicted.grade,
    confidence,
    nextLevelTip,
    color: predicted.color,
    averagePercentage: avgPct,
  }
}
