import type { ReviewItem } from '@/lib/courses/review-queue'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref } from '@/lib/insights/drill-link'

export type NextActionKind = 'review' | 'drill' | 'mark'

export type NextAction = {
  kind: NextActionKind
  /** Short stamp in the card chrome (e.g. DUE, Q, M1). */
  stamp: string
  title: string
  /** One sentence: why this is the next best action. */
  why: string
  ctaLabel: string
  href: string
  /** Optional secondary path (usually revisit the lesson). */
  secondary?: { label: string; href: string }
  /** Total due items in the queue — drives the open-loop line. */
  dueCount?: number
}

/**
 * Single dominant home CTA (DB-02). Priority:
 * 1. due review (marked weak topics + lesson recall) — mark-first
 * 2. topic / paper drill from recommendations
 * 3. mark a new answer
 */
export function buildNextAction(input: {
  reviewItems: ReviewItem[]
  recommendations: Recommendation[]
}): NextAction {
  const due = input.reviewItems[0]
  if (due) {
    const secondary =
      due.lessonHref != null
        ? { label: 'Open lesson', href: due.lessonHref }
        : undefined

    if (due.source === 'recall') {
      return {
        kind: 'review',
        stamp: 'DUE',
        title: `Due: ${due.name}`,
        why: `You checked ${due.name} recently. Mark one question in ${due.subjectLabel} before it fades.`,
        ctaLabel: 'Mark one question',
        href: due.practiceHref,
        secondary,
        dueCount: input.reviewItems.length,
      }
    }

    return {
      kind: 'review',
      stamp: 'DUE',
      title: `Due: ${due.name}`,
      why: `${due.name} is cooling in ${due.subjectLabel} — one marked question resets it.`,
      ctaLabel: 'Review now',
      href: due.practiceHref,
      secondary,
      dueCount: input.reviewItems.length,
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
    why: 'Nothing due. Build the next page of your ink history.',
    ctaLabel: 'Open Mark',
    href: '/mark',
  }
}
