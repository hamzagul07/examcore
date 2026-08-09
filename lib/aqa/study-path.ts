import { getAqaSubjects } from '@/lib/aqa/catalog'
import { aqaMarkHref, getAqaMarkableContentCodes } from '@/lib/aqa/marking'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { aqaSubjectPath } from '@/lib/seo/aqa-graph'

/** Tag a CAIE course lesson URL so the lesson can convert back to AQA mark. */
export function aqaStudyLessonHref(
  lessonHref: string,
  contentCode: string,
  opts?: { jumpToVisual?: boolean }
): string {
  const code = contentCode.trim().toLowerCase()
  const bare = lessonHref.split('#')[0] ?? lessonHref
  const [path, existing = ''] = bare.split('?')
  const params = new URLSearchParams(existing)
  params.set('board', 'aqa')
  params.set('subject', code)
  const qs = `${path}?${params.toString()}`
  return opts?.jumpToVisual === false ? qs : `${qs}#visual`
}

/** Valid AQA subject from lesson query (?board=aqa&subject=aqa-mathematics). */
export function parseAqaStudySubject(sp: {
  board?: string | null
  subject?: string | null
}): string | null {
  if ((sp.board ?? '').trim().toLowerCase() !== 'aqa') return null
  const code = (sp.subject ?? '').trim().toLowerCase()
  if (!code) return null
  return getAqaMarkableContentCodes().includes(code) ? code : null
}

/**
 * Lesson return path that keeps AQA board context after /mark.
 * Without the query, "Back to lesson" drops the study bridge.
 */
export function aqaStudyReturnPath(lessonPath: string, contentCode: string): string {
  return aqaStudyLessonHref(lessonPath, contentCode, { jumpToVisual: false })
}

/** Mark deep-link for an AQA study-path visit, with lesson return. */
export function aqaStudyMarkHref(
  contentCode: string,
  lessonPath: string,
  topicCode?: string | null
): string {
  return appendMarkReturn(
    aqaMarkHref(contentCode),
    aqaStudyReturnPath(lessonPath, contentCode),
    topicCode ?? undefined
  )
}

/** Subject hub for a content code (aqa-mathematics → /aqa/a-level/mathematics). */
export function aqaStudySubjectHubHref(contentCode: string): string | null {
  const subject = getAqaSubjects().find(
    (s) => s.contentCode === contentCode.trim().toLowerCase()
  )
  if (!subject) return null
  return aqaSubjectPath(subject.slug)
}

/** Short CTA label: "AQA Mathematics". */
export function aqaStudyLabel(contentCode: string): string {
  const subject = getAqaSubjects().find(
    (s) => s.contentCode === contentCode.trim().toLowerCase()
  )
  return subject ? `AQA ${subject.name}` : 'AQA'
}
