/**
 * Action Plan: 3 personalized "do this next" bullets (leaf-level).
 */

import type { AttemptLite, LeafMastery } from './mastery'
import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from './mastery'

export type ActionPlanType =
  | 'onboarding'
  | 'blindspot'
  | 'deficit'
  | 'grade_booster'
  | 'time_warning'
  | 'time_optimization'
  | 'streak'
  | 'coverage'
  | 'encouragement'
  | 'sampled'

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

function paperLabel(paper: string, masteries: LeafMastery[]): string {
  const meta = masteries.find((m) => m.paper === paper)
  return meta?.paperName || PAPER_NAMES[paper] || paper
}

export function generateActionPlan(
  attempts: AttemptLite[],
  masteries: LeafMastery[],
  streak: number,
  opts?: { subjectLabel?: string; totalTopics?: number }
): ActionPlanItem[] {
  const subjectLabel = opts?.subjectLabel ?? 'Cambridge 9709'
  const totalTopics = opts?.totalTopics ?? 38

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
        body: `The ${subjectLabel} syllabus has ${totalTopics} specification leaves. Even 5 minutes a day across different topics builds coverage fast.`,
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
        title: `Try a ${paperLabel(paper, masteries)} question next`,
        body: `You haven\u2019t touched any ${paper} leaves yet. Mixing papers builds resilience and gives your trajectory chart more signal.`,
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

  const items: ActionPlanItem[] = []

  const blindspot = findBiggestBlindspot(attempts, masteries)
  if (blindspot) {
    const paperLabelText = paperLabel(blindspot.paper, masteries)
    const parentNote =
      blindspot.parent.code !== blindspot.code
        ? ` (part of ${blindspot.parent.name})`
        : ''
    items.push({
      type: 'blindspot',
      title: 'Syllabus Blindspot Detected',
      body: `You haven\u2019t attempted any questions on ${blindspot.name} (${blindspot.code}${parentNote}). This appears in ${paperLabelText} papers.`,
      ctaText: 'Practice this leaf',
      ctaHref: `/mark?topic=${encodeURIComponent(blindspot.code)}`,
    })
  }

  const deficit = buildDeficitItem(masteries)
  if (deficit) {
    items.push(deficit)
  } else {
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

  const sampled = buildSampledItem(masteries)
  if (sampled && items.length < 3) {
    items.push(sampled)
  } else {
    items.push(buildStreakOrHabitItem(streak))
  }

  while (items.length < 3) {
    if (!sampled) {
      const sampledItem = buildSampledItem(masteries)
      if (sampledItem) {
        items.push(sampledItem)
        continue
      }
    }
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

function findUncoveredPapers(masteries: LeafMastery[]): string[] {
  const papersWithActivity = new Set(
    masteries.filter((m) => m.attemptsCount > 0).map((m) => m.paper)
  )
  const allPapers = Array.from(new Set(masteries.map((m) => m.paper)))
  return allPapers.filter((p) => !papersWithActivity.has(p))
}

function findBiggestBlindspot(
  attempts: AttemptLite[],
  masteries: LeafMastery[]
): LeafMastery | null {
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
  return masteries.find((m) => m.level === 'unattempted') || null
}

function findGradeBooster(masteries: LeafMastery[]): LeafMastery | null {
  const candidates = masteries
    .filter(
      (m) =>
        m.level === 'critical' &&
        m.attemptsCount >= MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY
    )
    .sort((a, b) => a.percentage - b.percentage)
  return candidates[0] || null
}

function buildDeficitItem(masteries: LeafMastery[]): ActionPlanItem | null {
  const critical = masteries.filter(
    (m) =>
      m.level === 'critical' &&
      m.attemptsCount >= MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY
  )
  if (critical.length === 0) return null

  const totalAtRisk = critical.reduce(
    (sum, m) => sum + Math.max(1, Math.round((100 - m.percentage) / 20)),
    0
  )

  const featured = critical.slice(0, 3).map((m) => `${m.name} (${m.code})`)
  const moreSuffix = critical.length > 3 ? ', and others' : ''

  return {
    type: 'deficit',
    title: 'Syllabus Deficit',
    body: `Approximately ${totalAtRisk} raw marks are at risk across ${critical.length} critical leaf${critical.length === 1 ? '' : 'es'}: ${featured.join(', ')}${moreSuffix}.`,
    ctaText: 'Review critical leaves',
    ctaHref: '/dashboard/progress#mastery-matrix',
  }
}

function buildSampledItem(masteries: LeafMastery[]): ActionPlanItem | null {
  const sampled = masteries.filter((m) => m.level === 'sampled')
  if (sampled.length < 5) return null

  return {
    type: 'sampled',
    title: 'Confirm your sampled topics',
    body: `You\u2019ve touched ${sampled.length} leaves with only 1–2 attempts each. Practice them further (${MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY}+ attempts per leaf) to confirm mastery.`,
    ctaText: 'See sampled leaves',
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
