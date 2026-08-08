import type { ExamSystem, LessonSurface } from '@/lib/exam-systems/types'

const MARK_BOARDS = new Set(['cambridge', 'ib', 'edexcel'])

/**
 * Deep-link back to /mark after signup/onboarding.
 * Preserves board (+ subject) so Edexcel/IB guests don't land on Cambridge.
 */
export function buildMarkReturnPath(opts: {
  board?: string | null
  subject?: string | null
}): string {
  const params = new URLSearchParams()
  const board = opts.board?.trim().toLowerCase()
  if (board && MARK_BOARDS.has(board)) {
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
