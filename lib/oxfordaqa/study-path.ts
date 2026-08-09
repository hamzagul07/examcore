import { getOxfordaqaSubjects } from '@/lib/oxfordaqa/catalog'
import {
  getOxfordaqaMarkableContentCodes,
  oxfordaqaMarkHref,
} from '@/lib/oxfordaqa/marking'
import {
  appendMarkReturn,
  appendStudyPathAttribution,
} from '@/lib/courses/format-session'
import { oxfordaqaSubjectPath } from '@/lib/seo/oxfordaqa-graph'

/** Tag a CAIE course lesson URL so the lesson can convert back to OxfordAQA mark. */
export function oxfordaqaStudyLessonHref(
  lessonHref: string,
  contentCode: string,
  opts?: { jumpToVisual?: boolean }
): string {
  const code = contentCode.trim().toLowerCase()
  const bare = lessonHref.split('#')[0] ?? lessonHref
  const [path, existing = ''] = bare.split('?')
  const params = new URLSearchParams(existing)
  params.set('board', 'oxfordaqa')
  params.set('subject', code)
  const qs = `${path}?${params.toString()}`
  return opts?.jumpToVisual === false ? qs : `${qs}#visual`
}

/** Valid OxfordAQA subject from lesson query (?board=oxfordaqa&subject=oxaqa-mathematics). */
export function parseOxfordaqaStudySubject(sp: {
  board?: string | null
  subject?: string | null
}): string | null {
  if ((sp.board ?? '').trim().toLowerCase() !== 'oxfordaqa') return null
  const code = (sp.subject ?? '').trim().toLowerCase()
  if (!code) return null
  return getOxfordaqaMarkableContentCodes().includes(code) ? code : null
}

/**
 * Lesson return path that keeps OxfordAQA board context after /mark.
 * Without the query, "Back to lesson" drops the study bridge.
 */
export function oxfordaqaStudyReturnPath(lessonPath: string, contentCode: string): string {
  return oxfordaqaStudyLessonHref(lessonPath, contentCode, { jumpToVisual: false })
}

/** Mark deep-link for an OxfordAQA study-path visit, with lesson return. */
export function oxfordaqaStudyMarkHref(
  contentCode: string,
  lessonPath: string,
  topicCode?: string | null
): string {
  return appendStudyPathAttribution(
    appendMarkReturn(
      oxfordaqaMarkHref(contentCode),
      oxfordaqaStudyReturnPath(lessonPath, contentCode),
      topicCode ?? undefined
    ),
    'oxfordaqa'
  )
}

/** Subject hub for a content code (oxaqa-mathematics → /oxfordaqa/.../mathematics). */
export function oxfordaqaStudySubjectHubHref(contentCode: string): string | null {
  const subject = getOxfordaqaSubjects().find(
    (s) => s.contentCode === contentCode.trim().toLowerCase()
  )
  if (!subject) return null
  return oxfordaqaSubjectPath(subject.qualification, subject.slug)
}

/** Short CTA label: "OxfordAQA Maths". */
export function oxfordaqaStudyLabel(contentCode: string): string {
  const subject = getOxfordaqaSubjects().find(
    (s) => s.contentCode === contentCode.trim().toLowerCase()
  )
  return subject ? `OxfordAQA ${subject.name}` : 'OxfordAQA'
}
