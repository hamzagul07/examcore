import { listMarkingExamSystems } from '@/lib/exam-systems/registry'
import type { ExamSystem, LessonSurface } from '@/lib/exam-systems/types'

/**
 * Deep-link back to /mark after signup/onboarding.
 * Preserves board (+ subject) so guests don't land on Cambridge by default.
 */
export function buildMarkReturnPath(opts: {
  board?: string | null
  subject?: string | null
}): string {
  const params = new URLSearchParams()
  const board = opts.board?.trim().toLowerCase()
  const liveMarkBoards = new Set(listMarkingExamSystems().map((s) => s.id))
  if (board && liveMarkBoards.has(board as never)) {
    params.set('board', board)
  }
  const subject = opts.subject?.trim()
  if (subject) {
    params.set('subject', subject)
  }
  const q = params.toString()
  return q ? `/mark?${q}` : '/mark'
}

/** `/{routePrefix}` e.g. /caie, /edexcel */
export function examSystemRootPath(system: ExamSystem): string {
  return `/${system.routePrefix}`
}

/** `/{routePrefix}/{qualificationSlug}` e.g. /edexcel/international-a-level */
export function qualificationHubPath(system: ExamSystem, qualificationSlug: string): string {
  return `/${system.routePrefix}/${qualificationSlug}`
}

/**
 * Generic subject hub under a qualification.
 * CAIE today uses /caie/{level}/{subjectSlug}/{code} — callers pass their segments.
 */
export function subjectHubPath(system: ExamSystem, segments: string[]): string {
  return `/${[system.routePrefix, ...segments.map((s) => s.replace(/^\/+|\/+$/g, ''))].join('/')}`
}

export function lessonSurfacePath(lessonPath: string, surface: LessonSurface): string {
  return `${lessonPath.replace(/\/$/, '')}/${surface}`
}
