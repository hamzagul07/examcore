/**
 * Cambridge public syllabus graph paths.
 *
 * Canonical shape:
 *   /caie/{level}/{subjectSlug}/{code}
 *   /caie/{level}/{subjectSlug}/{code}/{lessonSlug}
 *   /caie/{level}/{subjectSlug}/{code}/{lessonSlug}/{surface}
 *   /caie/{level}/{subjectSlug}/{code}/paper-{n}
 *
 * Legacy /courses/{code}/… stay live; metadata.canonical points here.
 */
import { getCourseLesson, getCourseLessons, getCourseSubject, getCourseSubjectCodes } from '@/lib/courses'
import type { CourseLesson } from '@/lib/courses/types'
import { getMarkingSubjectPages } from '@/lib/seo/programmatic-subjects'
import { topicToLessonSlug } from '@/lib/courses/slug'

export type CaieLevelSlug = 'a-level' | 'as-level' | 'o-level' | 'igcse'

export type CaieSurface = 'flashcards' | 'faq' | 'quiz' | 'questions' | 'mistakes'

export const CAIE_SURFACES: CaieSurface[] = [
  'flashcards',
  'faq',
  'quiz',
  'questions',
  'mistakes',
]

export type CaieSubjectRef = {
  code: string
  name: string
  levelSlug: CaieLevelSlug
  subjectSlug: string
  hubPath: string
}

function toSubjectSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function levelSlugFromLevels(levels: string[] | undefined, fallback: string): CaieLevelSlug {
  if (levels?.includes('IGCSE')) return 'igcse'
  if (levels?.includes('O-Level') && !levels.includes('A-Level')) return 'o-level'
  if (levels?.includes('AS-Level') && !levels.includes('A-Level')) return 'as-level'
  if (fallback.toLowerCase().includes('o-level')) return 'o-level'
  if (fallback.toLowerCase().includes('igcse')) return 'igcse'
  return 'a-level'
}

export function getCaieSubjectRef(code: string): CaieSubjectRef | null {
  const course = getCourseSubject(code)
  if (!course) return null
  const marking = getMarkingSubjectPages().find((s) => s.code === code)
  const levelSlug = levelSlugFromLevels(marking?.levels, course.level)
  const subjectSlug = toSubjectSlug(course.name)
  return {
    code,
    name: course.name,
    levelSlug,
    subjectSlug,
    hubPath: `/caie/${levelSlug}/${subjectSlug}/${code}`,
  }
}

export function caieLessonPath(code: string, lessonSlug: string): string | null {
  const ref = getCaieSubjectRef(code)
  if (!ref) return null
  return `${ref.hubPath}/${lessonSlug}`
}

export function caieSurfacePath(
  code: string,
  lessonSlug: string,
  surface: CaieSurface
): string | null {
  const base = caieLessonPath(code, lessonSlug)
  if (!base) return null
  return `${base}/${surface}`
}

export function caiePaperPath(code: string, paperNumber: string | number): string | null {
  const ref = getCaieSubjectRef(code)
  if (!ref) return null
  return `${ref.hubPath}/paper-${paperNumber}`
}

/** Normalize lesson.paper values like "P4", "Paper 4", "4" → "4". */
export function normalizePaperNumber(paper: string | undefined | null): string | null {
  if (!paper) return null
  const m = String(paper).match(/(\d+)/)
  return m?.[1] ?? null
}

/** Full lessons only — outlines do not get child surface URLs (thin content gate). */
export function isIndexableLesson(lesson: CourseLesson): boolean {
  return lesson.status === 'published' || lesson.status === 'premium'
}

export function lessonHasSurface(lesson: CourseLesson, surface: CaieSurface): boolean {
  if (!isIndexableLesson(lesson)) return false
  switch (surface) {
    case 'flashcards':
      return (lesson.flashcards?.length ?? 0) >= 3
    case 'faq':
      return (lesson.faq?.length ?? 0) >= 2
    case 'quiz':
      return (lesson.quickCheck?.length ?? 0) >= 2
    case 'questions': {
      const practice = lesson.sections?.some((s) => s.type === 'pastPaperPractice')
      const worked = lesson.sections?.some((s) => s.type === 'workedExample')
      return Boolean(practice || worked || (lesson.pastPaperReferences?.length ?? 0) > 0)
    }
    case 'mistakes': {
      const tips = lesson.sections?.filter((s) => s.type === 'examTip') ?? []
      return tips.length >= 1 || (lesson.faq?.length ?? 0) >= 1
    }
    default:
      return false
  }
}

export function getAllCaieHubParams(): Array<{
  level: string
  subject: string
  code: string
}> {
  return getCourseSubjectCodes()
    .map((code) => getCaieSubjectRef(code))
    .filter((r): r is CaieSubjectRef => r !== null)
    .map((r) => ({
      level: r.levelSlug,
      subject: r.subjectSlug,
      code: r.code,
    }))
}

export function getAllCaieLessonParams(): Array<{
  level: string
  subject: string
  code: string
  topic: string
}> {
  const out: Array<{ level: string; subject: string; code: string; topic: string }> = []
  for (const code of getCourseSubjectCodes()) {
    const ref = getCaieSubjectRef(code)
    if (!ref) continue
    for (const lesson of getCourseLessons(code)) {
      if (!isIndexableLesson(lesson)) continue
      out.push({
        level: ref.levelSlug,
        subject: ref.subjectSlug,
        code,
        topic: lesson.slug || topicToLessonSlug(lesson.topicCode, lesson.title),
      })
    }
  }
  return out
}

export function getAllCaieSurfaceParams(): Array<{
  level: string
  subject: string
  code: string
  topic: string
  surface: CaieSurface
}> {
  const out: Array<{
    level: string
    subject: string
    code: string
    topic: string
    surface: CaieSurface
  }> = []
  for (const code of getCourseSubjectCodes()) {
    const ref = getCaieSubjectRef(code)
    if (!ref) continue
    for (const lesson of getCourseLessons(code)) {
      if (!isIndexableLesson(lesson)) continue
      for (const surface of CAIE_SURFACES) {
        if (!lessonHasSurface(lesson, surface)) continue
        out.push({
          level: ref.levelSlug,
          subject: ref.subjectSlug,
          code,
          topic: lesson.slug,
          surface,
        })
      }
    }
  }
  return out
}

export function resolveCaieParams(
  level: string,
  subject: string,
  code: string
): CaieSubjectRef | null {
  const ref = getCaieSubjectRef(code)
  if (!ref) return null
  if (ref.levelSlug !== level || ref.subjectSlug !== subject) return null
  return ref
}

export function resolveCaieLesson(
  level: string,
  subject: string,
  code: string,
  topic: string
): { ref: CaieSubjectRef; lesson: CourseLesson } | null {
  const ref = resolveCaieParams(level, subject, code)
  if (!ref) return null
  const lesson = getCourseLesson(code, topic)
  if (!lesson || !isIndexableLesson(lesson)) return null
  return { ref, lesson }
}
