import type { ExamSystem, LessonSurface } from '@/lib/exam-systems/types'

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
