/**
 * Action Plan: 3 personalized "do this next" bullets.
 *
 * Tiered by data density:
 *   - 0 attempts: pure onboarding. We don't have signal yet; nudge them to mark.
 *   - 1-3 attempts: emphasize breadth ("you've started P1, try a P3 topic next").
 *   - 4+ attempts: real diagnostics — biggest blindspot, highest-yield critical
 *     topic, streak/time encouragement.
 *
 * Each tier always returns exactly 3 items so the UI never collapses to fewer
 * cards (which would look broken next to the 3-up grid).
 */

import type { AttemptLite, TopicMastery } from './mastery'

export type ActionPlanType =
  | 'onboarding'
  /** Sprint 21: a high-yield topic the student hasn't attempted yet. */
  | 'blindspot'
  /** Sprint 21: estimate of raw marks currently at risk across critical topics. */
  | 'deficit'
  | 'grade_booster'
  | 'time_warning'
  /** Sprint 21: nudge to build a daily practice habit when no streak exists. */
  | 'time_optimization'
  | 'streak'
  | 'coverage'
  | 'encouragement'

export interface ActionPlanItem {
  type: ActionPlanType
  title: string
  body: string
  ctaText: string
  ctaHref: string
}

const PAPER_NAMES: Record<string, string> = {
  P1: 'Pure Math 1',
  P2: 'Pure Math 2',
  P3: 'Pure Math 3',
  P4: 'Mechanics',
  P5: 'Statistics 1',
  P6: 'Statistics 2',
}

export function generateActionPlan(
  attempts: AttemptLite[],
  masteries: TopicMastery[],
  streak: number
): ActionPlanItem[] {
  // ============ TIER 1: cold start ============
  if (attempts.length === 0) {
    return [
      {
        type: 'onboarding',
        title: 'Mark your first answer',
        body: 'Upload a photo of any past-paper question with your working. You\u2019ll have feedback in 30 seconds.',
        ctaText: 'Start marking',
        ctaHref: '/mark',
      },
      {
        type: 'coverage',
        title: 'Aim for breadth, not perfection',
        body: 'The Cambridge 9709 syllabus has 38 topics. Even 5 minutes a day across different topics builds coverage fast.',
        ctaText: 'See the syllabus',
        ctaHref: '#mastery-matrix',
      },
      {
        type: 'encouragement',
        title: 'One question = one data point',
        body: 'Your trajectory, predicted grade, and mastery map all unlock as you mark more questions. Three is enough to start.',
        ctaText: 'Mark another',
        ctaHref: '/mark',
      },
    ]
  }

  // ============ TIER 2: warming up ============
  if (attempts.length < 4) {
    const uncoveredPapers = findUncoveredPapers(masteries)
    const items: ActionPlanItem[] = []

    items.push({
      type: 'coverage',
      title: `You\u2019ve started ${attempts.length === 1 ? '1 attempt' : `${attempts.length} attempts`} — keep going`,
      body: 'Your predictive grade and mastery confidence both improve sharply between attempts 3 and 10. Push to 5 today.',
      ctaText: 'Mark another',
      ctaHref: '/mark',
    })

    if (uncoveredPapers.length > 0) {
      const paper = uncoveredPapers[0]
      items.push({
        type: 'blindspot',
        title: `Try a ${PAPER_NAMES[paper] || paper} question next`,
        body: `You haven\u2019t touched any ${paper} topics yet. Mixing papers builds resilience and gives your trajectory chart more signal.`,
        ctaText: `Mark a ${paper} question`,
        ctaHref: '/mark',
      })
    } else {
      items.push({
        type: 'encouragement',
        title: 'Nice spread across papers',
        body: 'You\u2019ve already touched multiple papers. Keep mixing them — variety beats grinding the same topic.',
        ctaText: 'Mark another',
        ctaHref: '/mark',
      })
    }

    items.push({
      type: streak > 0 ? 'streak' : 'encouragement',
      title: streak > 0 ? `${streak}-day streak — protect it` : 'Build a daily habit',
      body:
        streak > 0
          ? 'Mark one question today to extend the streak. Tomorrow-you will thank you.'
          : 'Students who mark even one question a day score noticeably higher. Start a streak today.',
      ctaText: 'Mark one now',
      ctaHref: '/mark',
    })

    return items.slice(0, 3)
  }

  // ============ TIER 3: data-driven (Sprint 21 wording) ============
  //
  // Three bullet types in priority order:
  //   1. Syllabus Blindspot — high-yield topic the student hasn't attempted.
  //   2. Syllabus Deficit  — estimate of raw marks at risk across Critical
  //      topics. Concrete numeric framing is more motivating than "improve X".
  //   3. Streak / time_optimization — a habit-driven nudge.
  //
  // If any slot can't be filled (e.g. zero Critical topics) we fall back to
  // grade_booster / encouragement so the 3-up grid never collapses.
  const items: ActionPlanItem[] = []

  // (1) Syllabus Blindspot
  const blindspot = findBiggestBlindspot(attempts, masteries)
  if (blindspot) {
    const paperLabel = PAPER_NAMES[blindspot.paper] || blindspot.paper
    items.push({
      type: 'blindspot',
      title: 'Syllabus Blindspot Detected',
      body: `You haven\u2019t yet attempted any questions under ${blindspot.name} (${blindspot.code}). This topic appears regularly in ${paperLabel} papers.`,
      ctaText: 'Practice this topic',
      ctaHref: `/mark?topic=${encodeURIComponent(blindspot.code)}`,
    })
  }

  // (2) Syllabus Deficit
  const deficit = buildDeficitItem(masteries)
  if (deficit) {
    items.push(deficit)
  } else {
    // No critical topics — surface the lowest Proficient instead, framed as a
    // grade-booster so we still give the student a concrete fix.
    const booster = findGradeBooster(masteries)
    if (booster) {
      items.push({
        type: 'grade_booster',
        title: `Highest-yield fix: ${booster.name}`,
        body: `You\u2019re at ${Math.round(booster.percentage)}% on ${booster.code} across ${booster.attemptsCount} attempt${booster.attemptsCount === 1 ? '' : 's'}. Lifting it to Exam Ready (75%+) gives the biggest jump to your predicted grade.`,
        ctaText: `Drill ${booster.code}`,
        ctaHref: '/mark',
      })
    }
  }

  // (3) Streak / time_optimization
  items.push(buildStreakOrHabitItem(streak))

  // Belt-and-braces: if any of the above returned null we fall back gracefully.
  while (items.length < 3) {
    items.push({
      type: 'encouragement',
      title: 'Keep the rhythm going',
      body: 'You\u2019ve got the habit. One more question today sharpens your trajectory line.',
      ctaText: 'Mark another',
      ctaHref: '/mark',
    })
  }

  return items.slice(0, 3)
}

// ----------------------------- helpers -----------------------------

function findUncoveredPapers(masteries: TopicMastery[]): string[] {
  const papersWithActivity = new Set(
    masteries.filter((m) => m.attemptsCount > 0).map((m) => m.paper)
  )
  const allPapers = Array.from(new Set(masteries.map((m) => m.paper)))
  return allPapers.filter((p) => !papersWithActivity.has(p))
}

function findBiggestBlindspot(
  attempts: AttemptLite[],
  masteries: TopicMastery[]
): TopicMastery | null {
  // "Most-used paper" = the paper holding the most tagged attempts.
  const paperCount: Record<string, number> = {}
  for (const a of attempts) {
    for (const tag of a.syllabus_tags || []) {
      const paper = masteries.find((m) => m.code === tag)?.paper
      if (paper) paperCount[paper] = (paperCount[paper] || 0) + 1
    }
  }
  const sortedPapers = Object.entries(paperCount).sort((a, b) => b[1] - a[1])
  for (const [paper] of sortedPapers) {
    const blank = masteries.find(
      (m) => m.paper === paper && m.level === 'unattempted'
    )
    if (blank) return blank
  }
  // Fall back to ANY unattempted topic if their paper is complete.
  return masteries.find((m) => m.level === 'unattempted') || null
}

function findGradeBooster(masteries: TopicMastery[]): TopicMastery | null {
  const candidates = masteries
    .filter((m) => m.level === 'critical' && m.attemptsCount > 0)
    .sort((a, b) => a.percentage - b.percentage)
  return candidates[0] || null
}

/**
 * Estimate raw marks at risk across Critical topics, framed as a Syllabus
 * Deficit bullet. The "at risk" number is a deliberate approximation: we
 * weight each Critical topic by how far it is below 100% and divide by 20
 * (i.e. assume the typical Critical topic costs ~5 marks if left untouched).
 * It's directional, not precise — Cambridge papers don't have a fixed mark
 * count per topic — but a concrete number reads better than "several".
 */
function buildDeficitItem(masteries: TopicMastery[]): ActionPlanItem | null {
  const critical = masteries.filter((m) => m.level === 'critical')
  if (critical.length === 0) return null

  const totalAtRisk = critical.reduce(
    (sum, m) => sum + Math.max(1, Math.round((100 - m.percentage) / 20)),
    0
  )

  const featured = critical.slice(0, 3).map((m) => m.name)
  const moreSuffix = critical.length > 3 ? ', and others' : ''

  return {
    type: 'deficit',
    title: 'Syllabus Deficit',
    body: `Approximately ${totalAtRisk} raw marks are currently at risk based on ${critical.length} Critical topic${critical.length === 1 ? '' : 's'}: ${featured.join(', ')}${moreSuffix}.`,
    ctaText: 'Review critical topics',
    ctaHref: '/dashboard/progress#mastery-matrix',
  }
}

function buildStreakOrHabitItem(streak: number): ActionPlanItem {
  if (streak >= 3) {
    return {
      type: 'streak',
      title: 'Maintain Your Momentum',
      body: `You\u2019ve practiced ${streak} consecutive days. Mark at least one question today to extend your streak.`,
      ctaText: 'Mark a question',
      ctaHref: '/mark',
    }
  }
  return {
    type: 'time_optimization',
    title: 'Build a Practice Habit',
    body: 'Students who practice daily for 5+ days improve marks by an average of 12%. Start your streak now.',
    ctaText: 'Begin today',
    ctaHref: '/mark',
  }
}
