import { requiresGuestSignup } from '@/lib/auth-gates'
import { isSafeNextPath } from '@/lib/auth-redirect'
import { ibMarkingCodeFromSlug } from '@/lib/ib/legitimate-resources'
import { IB_MARKING_PROFILES } from '@/lib/ib/marking-config'
import { ibCourseContentSlug } from '@/lib/ib/slug-resolve'
import type { OnboardingInput } from '@/lib/onboarding/save-profile'
import {
  DEFAULT_BOARD,
  IB_BOARD_ID,
  IB_DIPLOMA_LEVEL,
  SUBJECTS,
  isIbSubjectId,
  isSubjectValidForProfile,
} from '@/lib/profile-options'
import type { PrimaryGoal, UserStage } from '@/lib/database.types'

export function pathnameFromReturnPath(returnPath: string): string {
  const q = returnPath.indexOf('?')
  return q >= 0 ? returnPath.slice(0, q) : returnPath
}

/** True when `returnPath` targets a gated topic / lesson URL. */
export function isContentGateReturnPath(returnPath: string | null | undefined): returnPath is string {
  if (!isSafeNextPath(returnPath)) return false
  return requiresGuestSignup(pathnameFromReturnPath(returnPath.trim()))
}

/** Full in-app return URL including query string (e.g. ?paper=1). */
export function buildContentReturnPath(
  pathname: string,
  search: string | URLSearchParams | null | undefined
): string {
  if (!search) return pathname
  const qs = typeof search === 'string' ? search.replace(/^\?/, '') : search.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

function findCambridgeSubjectByCode(code: string): { id: string; level: string } | null {
  const matches = SUBJECTS.filter((s) => s.code === code && s.enabled)
  if (matches.length === 0) return null

  const levelOrder = ['A-Level', 'O-Level', 'AS Level']
  for (const level of levelOrder) {
    const match = matches.find((s) => s.levels.includes(level))
    if (match) return { id: match.id, level }
  }

  const first = matches[0]
  return { id: first.id, level: first.levels[0] ?? 'A-Level' }
}

/** Minimal onboarding payload inferred from a deep content return URL. */
export function inferMinimalOnboardingForContentPath(
  returnPath: string
): OnboardingInput | null {
  const parts = pathnameFromReturnPath(returnPath).split('/').filter(Boolean)

  if (parts[0] === 'courses' || (parts[0] === 'past-papers' && parts[1] !== 'topics')) {
    const code = parts[1]
    if (!code) return null
    const subject = findCambridgeSubjectByCode(code)
    if (!subject) return null
    if (!isSubjectValidForProfile(DEFAULT_BOARD, subject.level, subject.id)) return null
    return minimalBrowseProfile(DEFAULT_BOARD, subject.level, subject.id)
  }

  if (parts[0] === 'ib' && (parts[1] === 'courses' || parts[1] === 'past-papers') && parts[2]) {
    const contentSlug = ibCourseContentSlug(parts[2])
    const profile =
      IB_MARKING_PROFILES.find((p) => p.slug === contentSlug) ??
      IB_MARKING_PROFILES.find((p) => p.code === ibMarkingCodeFromSlug(contentSlug))
    const subjectId = profile?.code ?? ibMarkingCodeFromSlug(contentSlug)
    if (!isIbSubjectId(subjectId)) return null
    return minimalBrowseProfile(IB_BOARD_ID, IB_DIPLOMA_LEVEL, subjectId)
  }

  return null
}

function minimalBrowseProfile(
  board: string,
  level: string,
  subjectId: string
): OnboardingInput {
  return {
    board,
    level,
    subjects: [subjectId],
    stage: 'other' as UserStage,
    primary_goal: 'track_progress' as PrimaryGoal,
    exam_date: null,
    role: 'student',
  }
}
