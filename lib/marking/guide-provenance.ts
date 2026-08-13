import type { ResolvedIbComponent } from '@/lib/marking/types'

/**
 * What to tell a student about the guide their work was marked against.
 *
 * Marking against a withdrawn rubric is not automatically wrong — somebody
 * revising a 2024 past paper wants the rubric that paper was set under, and
 * refusing would make the product useless for exactly the revision it exists
 * for. What is wrong is doing it silently, so that a student working on current
 * coursework cannot tell their feedback is describing an assessment they will
 * never sit.
 *
 * So: mark, and say which guide. The caution appears only when it changes what
 * the student should do with the feedback.
 */

export type GuideNotice = {
  /** e.g. "IB Visual Arts guide, first assessed 2016". Always present. */
  label: string
  /** Set only when the guide is spent or nearly so. */
  caution?: string
  /** For filtering and reporting; not shown as-is. */
  status: 'current' | 'final-session' | 'withdrawn' | 'unknown'
}

export function describeGuide(
  resolved: Pick<ResolvedIbComponent, 'subjectName' | 'guide'> | null | undefined,
  /** The session being marked against — defaults to now. */
  session: number = new Date().getFullYear()
): GuideNotice | null {
  const guide = resolved?.guide
  if (!resolved || !guide) return null

  const first = guide.firstAssessmentYear
  const last = guide.lastAssessmentYear
  const label =
    `IB ${resolved.subjectName} guide` +
    (first ? `, first assessed ${first}` : '') +
    (last ? `, last assessed ${last}` : '')

  // No published end date is not the same as verified current: it is also what
  // a subject nobody has checked looks like. Neither claims nor cautions.
  if (last == null) return { label, status: 'unknown' }

  if (last < session) {
    return {
      label,
      status: 'withdrawn',
      caution:
        `This was marked against the ${resolved.subjectName} guide last assessed in ${last}. ` +
        'If you are studying now you sit a newer guide, and some of this feedback will describe criteria that no longer apply.',
    }
  }

  if (last === session) {
    return {
      label,
      status: 'final-session',
      caution:
        `${session} is the final session for this ${resolved.subjectName} guide. ` +
        'It is the right rubric if you are sitting exams this year, and the wrong one if you have just started the course.',
    }
  }

  return { label, status: 'current' }
}
