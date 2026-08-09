import type { ReviewItem } from '@/lib/courses/review-queue'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'

export type NextActionKind = 'review' | 'drill' | 'mark'

export type NextAction = {
  kind: NextActionKind
  /** Short stamp in the card chrome (e.g. RV, Q, M1). */
  stamp: string
  title: string
  /** One sentence: why this is the next best action. */
  why: string
  ctaLabel: string
  href: string
}

/**
 * Single dominant home CTA (DB-02). Priority:
 * 1. due spaced review
 * 2. topic / paper drill from recommendations
 * 3. mark a new answer
 */
export function buildNextAction(input: {
  reviewItems: ReviewItem[]
  recommendations: Recommendation[]
}): NextAction {
  const due = input.reviewItems[0]
  if (due) {
    const href = due.lessonHref ?? due.practiceHref
    const why =
      due.source === 'recall'
        ? `${due.name} is due for spaced recall in ${due.subjectLabel}.`
        : `${due.name} is your weakest due topic in ${due.subjectLabel} — review it before it cools.`
    return {
      kind: 'review',
      stamp: 'RV',
      title: due.source === 'recall' ? `Recall: ${due.name}` : `Review: ${due.name}`,
      why,
      ctaLabel: due.lessonHref ? 'Open lesson' : 'Practice now',
      href,
    }
  }

  const rec = input.recommendations[0]
  if (rec) {
    return {
      kind: 'drill',
      stamp: `Q${rec.questionNumber}`,
      title: rec.targetLabel,
      why: rec.reason,
      ctaLabel: 'Drill this',
      href: drillHref(rec),
    }
  }

  return {
    kind: 'mark',
    stamp: 'M1',
    title: 'Mark a new answer',
    why: 'Upload working and get examiner-style feedback — build the next page of your ink history.',
    ctaLabel: 'Open Mark',
    href: '/mark',
  }
}
