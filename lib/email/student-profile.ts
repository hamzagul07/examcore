import {
  IB_DIPLOMA_LEVEL,
  getSubjectById,
  isIbBoard,
  type SubjectOption,
} from '@/lib/profile-options'
import { SITE_URL } from '@/lib/site-config'

/**
 * The onboarding answers an email needs before it can say anything specific.
 *
 * Shared because getting this wrong is not cosmetic: an IB student told their
 * work is marked "against the real Cambridge scheme" has been given a reason to
 * distrust every number the product shows them afterwards. Resolving the board
 * once, here, keeps every email honest about which examiner it is imitating.
 */
export type EmailStudentInput = {
  board?: string | null
  level?: string | null
  subjects?: string[] | null
}

export type EmailStudentProfile = {
  ib: boolean
  levelLabel: string
  /** Subjects that can actually be marked today — the only ones worth linking. */
  markable: SubjectOption[]
  notYetMarkable: SubjectOption[]
}

export function resolveStudentProfile(input: EmailStudentInput): EmailStudentProfile {
  const ib = isIbBoard(input.board ?? '') || input.level === IB_DIPLOMA_LEVEL
  const level = input.level ?? undefined

  const options = (input.subjects ?? [])
    .map((id) => getSubjectById(id, level))
    .filter((s): s is SubjectOption => Boolean(s))

  return {
    ib,
    levelLabel: ib ? 'IB Diploma' : (input.level?.trim() || 'A-Level'),
    markable: options.filter((s) => s.markingEnabled),
    notYetMarkable: options.filter((s) => !s.markingEnabled),
  }
}

/** Deep link into the marker with the subject already chosen. */
export function markHref(subjectCode?: string): string {
  return subjectCode
    ? `${SITE_URL}/mark?subject=${encodeURIComponent(subjectCode)}`
    : `${SITE_URL}/mark`
}

/** Whole days until the exam, or null when there is no date or it has passed. */
export function daysUntilExam(examDate?: string | null, now: Date = new Date()): number | null {
  if (!examDate) return null
  const then = new Date(`${examDate}T00:00:00Z`).getTime()
  if (Number.isNaN(then)) return null
  const days = Math.ceil((then - now.getTime()) / 86_400_000)
  return days > 0 ? days : null
}
