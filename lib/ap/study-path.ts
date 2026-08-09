import { getApCourses } from '@/lib/ap/catalog'
import { apMarkHref, getApMarkableContentCodes } from '@/lib/ap/marking'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { apCoursePath } from '@/lib/seo/ap-graph'

/** Tag a CAIE course lesson URL so the lesson can convert back to AP mark. */
export function apStudyLessonHref(
  lessonHref: string,
  contentCode: string,
  opts?: { jumpToVisual?: boolean }
): string {
  const code = contentCode.trim().toLowerCase()
  const bare = lessonHref.split('#')[0] ?? lessonHref
  const [path, existing = ''] = bare.split('?')
  const params = new URLSearchParams(existing)
  params.set('board', 'ap')
  params.set('subject', code)
  const qs = `${path}?${params.toString()}`
  return opts?.jumpToVisual === false ? qs : `${qs}#visual`
}

/** Valid AP course from lesson query (?board=ap&subject=ap-calculus-ab). */
export function parseApStudySubject(sp: {
  board?: string | null
  subject?: string | null
}): string | null {
  if ((sp.board ?? '').trim().toLowerCase() !== 'ap') return null
  const code = (sp.subject ?? '').trim().toLowerCase()
  if (!code) return null
  return getApMarkableContentCodes().includes(code) ? code : null
}

/**
 * Lesson return path that keeps AP board context after /mark.
 * Without the query, "Back to lesson" drops the study bridge.
 */
export function apStudyReturnPath(lessonPath: string, contentCode: string): string {
  return apStudyLessonHref(lessonPath, contentCode, { jumpToVisual: false })
}

/** Mark deep-link for an AP study-path visit, with lesson return. */
export function apStudyMarkHref(
  contentCode: string,
  lessonPath: string,
  topicCode?: string | null
): string {
  return appendMarkReturn(
    apMarkHref(contentCode),
    apStudyReturnPath(lessonPath, contentCode),
    topicCode ?? undefined
  )
}

/** Course hub for a content code (ap-calculus-ab → /ap/calculus-ab). */
export function apStudySubjectHubHref(contentCode: string): string | null {
  const course = getApCourses().find(
    (c) => c.contentCode === contentCode.trim().toLowerCase()
  )
  if (!course) return null
  return apCoursePath(course.slug)
}

/** Short CTA label: "AP Calculus AB". */
export function apStudyLabel(contentCode: string): string {
  const course = getApCourses().find(
    (c) => c.contentCode === contentCode.trim().toLowerCase()
  )
  return course ? `AP ${course.name}` : 'AP'
}
