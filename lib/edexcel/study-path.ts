import { findEdexcelSubjectByUnitCode } from '@/lib/edexcel/catalog'
import { getEdexcelMarkableUnitCodes } from '@/lib/edexcel/marking'
import { edexcelMarkHref } from '@/lib/edexcel/marking'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { edexcelUnitPath } from '@/lib/seo/edexcel-graph'

/** Tag a CAIE course lesson URL so the lesson can convert back to Edexcel mark. */
export function edexcelStudyLessonHref(
  lessonHref: string,
  unitCode: string,
  opts?: { jumpToVisual?: boolean }
): string {
  const unit = unitCode.trim().toUpperCase()
  const bare = lessonHref.split('#')[0] ?? lessonHref
  const [path, existing = ''] = bare.split('?')
  const params = new URLSearchParams(existing)
  params.set('board', 'edexcel')
  params.set('unit', unit)
  const qs = `${path}?${params.toString()}`
  return opts?.jumpToVisual === false ? qs : `${qs}#visual`
}

/** Valid Edexcel unit from lesson query (?board=edexcel&unit=WMA11). */
export function parseEdexcelStudyUnit(sp: {
  board?: string | null
  unit?: string | null
}): string | null {
  if ((sp.board ?? '').trim().toLowerCase() !== 'edexcel') return null
  const unit = (sp.unit ?? '').trim().toUpperCase()
  if (!unit) return null
  return getEdexcelMarkableUnitCodes().includes(unit) ? unit : null
}

/**
 * Lesson return path that keeps Edexcel board context after /mark.
 * Without the query, "Back to lesson" drops the study bridge.
 */
export function edexcelStudyReturnPath(lessonPath: string, unitCode: string): string {
  return edexcelStudyLessonHref(lessonPath, unitCode, { jumpToVisual: false })
}

/** Mark deep-link for an Edexcel study-path visit, with lesson return. */
export function edexcelStudyMarkHref(
  unitCode: string,
  lessonPath: string,
  topicCode?: string | null
): string {
  return appendMarkReturn(
    edexcelMarkHref(unitCode),
    edexcelStudyReturnPath(lessonPath, unitCode),
    topicCode ?? undefined
  )
}

/** Unit hub path for a Pearson IAL code (WMA11 → maths, WPH11 → physics, …). */
export function edexcelStudyUnitHubHref(unitCode: string): string | null {
  const subject = findEdexcelSubjectByUnitCode(unitCode)
  if (!subject) return null
  return edexcelUnitPath(subject.qualification, subject.slug, unitCode)
}
