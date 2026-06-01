/**
 * The hero insight is the single most useful thing we can say to this student
 * right now: a diagnosis plus a prescription. Priority order is
 *   error pattern -> topic deficit -> grade-up opportunity -> momentum,
 * but we only ever assert what the data supports.
 */

import type { AttemptLite, LeafMastery } from '@/lib/mastery'
import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from '@/lib/mastery'
import type { GradePrediction } from '@/lib/prediction'
import { getNextGrade } from '@/lib/grade-boundaries'
import type { DashboardState, HeroInsight, Pattern, Recommendation } from './types'
import { PATTERN_UNLOCK_THRESHOLD } from './types'

type Args = {
  state: DashboardState
  attempts: AttemptLite[]
  masteries: LeafMastery[]
  patterns: Pattern[]
  recommendations: Recommendation[]
  prediction: GradePrediction
  subjectLabel: string
}

export function buildHeroInsight(args: Args): HeroInsight {
  const { state } = args

  if (state === 'zero') {
    return {
      kind: 'onboarding',
      eyebrow: 'Your coach is ready',
      headline: 'Start marking to unlock your insights',
      body: 'Mark a past-paper question and this dashboard turns it into a read on your strengths, your recurring mistakes, and exactly what to practise next.',
      ctaLabel: 'Mark your first question',
      ctaHref: '/mark',
    }
  }

  if (state === 'low') {
    const current = args.attempts.length
    return {
      kind: 'onboarding',
      eyebrow: 'Building your profile',
      headline: 'Mark 5+ questions to unlock pattern insights',
      body: `You're ${PATTERN_UNLOCK_THRESHOLD - current} question${
        PATTERN_UNLOCK_THRESHOLD - current === 1 ? '' : 's'
      } away from your first pattern read. Until then, keep marking across different topics to give your coach more to work with.`,
      ctaLabel: 'Mark another question',
      ctaHref: '/mark',
      progress: { current, target: PATTERN_UNLOCK_THRESHOLD },
    }
  }

  // ---- active: choose the strongest real signal ----
  const drill = args.recommendations[0]

  // 1. Dominant error pattern.
  const topPattern = args.patterns[0]
  if (topPattern && topPattern.attemptsAffected >= 2) {
    const matched = pickDrillForTopic(args.recommendations, args.masteries)
    return {
      kind: 'error_pattern',
      eyebrow: 'Your biggest leak',
      headline: topPattern.label,
      body: `${topPattern.insight}${
        matched ? ` Here's a question that puts it under pressure.` : ''
      }`,
      ctaLabel: matched ? 'Drill this' : 'Practise now',
      drill: matched ?? drill,
      ctaHref: matched || drill ? undefined : '/mark',
    }
  }

  // 2. Weakest confirmed topic.
  const weakest = [...args.masteries]
    .filter(
      (m) =>
        m.level === 'critical' &&
        m.attemptsCount >= MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY
    )
    .sort((a, b) => a.percentage - b.percentage)[0]
  if (weakest) {
    const matched = matchRecommendation(args.recommendations, weakest.code)
    return {
      kind: 'topic_deficit',
      eyebrow: 'Highest-yield fix',
      headline: weakest.name,
      body: `You're holding ${Math.round(weakest.percentage)}% on ${
        weakest.code
      } across ${weakest.attemptsCount} attempts. Lifting it to Exam Ready is the biggest single move for your grade.`,
      ctaLabel: matched ? 'Drill this' : 'Practise this topic',
      drill: matched ?? drill,
      ctaHref: matched || drill ? undefined : '/mark',
    }
  }

  // 3. Grade-up opportunity.
  if (
    args.prediction.predictedGrade !== '\u2014' &&
    args.prediction.averagePercentage !== null
  ) {
    const next = getNextGrade(
      args.prediction.predictedGrade as Exclude<
        GradePrediction['predictedGrade'],
        '\u2014'
      >
    )
    return {
      kind: 'grade_up',
      eyebrow: next ? `Push toward ${next}` : 'Hold your A*',
      headline: `Tracking at ${args.prediction.predictedGrade}`,
      body: args.prediction.nextLevelTip,
      ctaLabel: drill ? 'Drill this' : 'Keep marking',
      drill,
      ctaHref: drill ? undefined : '/mark',
    }
  }

  // 4. Momentum — honest, no confetti.
  return {
    kind: 'momentum',
    eyebrow: 'Steady work',
    headline: 'No glaring weak spot right now',
    body: `Your recent ${args.subjectLabel} marks are clean across the board. Keep widening coverage so the next gap shows up early rather than on exam day.`,
    ctaLabel: drill ? 'Drill this' : 'Mark another',
    drill,
    ctaHref: drill ? undefined : '/mark',
  }
}

function matchRecommendation(
  recs: Recommendation[],
  topicCode: string
): Recommendation | undefined {
  return recs.find((r) => r.topicCode === topicCode)
}

function pickDrillForTopic(
  recs: Recommendation[],
  masteries: LeafMastery[]
): Recommendation | undefined {
  const weakest = [...masteries]
    .filter((m) => m.level === 'critical' && m.attemptsCount > 0)
    .sort((a, b) => a.percentage - b.percentage)[0]
  if (weakest) {
    const matched = matchRecommendation(recs, weakest.code)
    if (matched) return matched
  }
  return recs[0]
}
