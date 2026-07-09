import 'server-only'

import { getSyllabusTopicByCode } from '@/lib/syllabi'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { getCourseLesson } from '@/lib/courses'
import { getIbCourseLessons } from '@/lib/courses/ib'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

export type ResolvedLesson = { code: string; name: string; href: string }

/** Deep-link "study this" straight to the worked examples (where the marks are
 * shown) when the lesson has any, instead of the top of the page. */
function workedAnchor(lesson: { sections?: { type: string }[] }): string {
  return lesson.sections?.some((s) => s.type === 'workedExample') ? '#worked' : ''
}

/**
 * Builds a topic-code → course-lesson resolver for one subject, board-aware and
 * existence-verified (never returns a link that 404s).
 *
 * - Cambridge: syllabus topic → lesson slug → getCourseLesson → /courses/{code}/{slug}
 * - IB: match the lesson by topicCode → /ib/courses/{shortSlug}/{lessonSlug}
 *   (marking subject codes are prefixed, e.g. `ib-biology-hl`, while routes and
 *   content folders use the short `biology-hl`).
 *
 * IB lessons are fetched once and indexed, so callers can resolve many codes
 * cheaply. Server-only (reads the course content tree).
 */
export function makeTopicLessonResolver(
  subjectCode: string
): (topicCode: string) => ResolvedLesson | null {
  if (isIbSubjectCode(subjectCode)) {
    const routeSlug = subjectCode.replace(/^ib-/, '')
    const byTopic = new Map(
      getIbCourseLessons(routeSlug).map((l) => [l.topicCode, l])
    )
    return (topicCode) => {
      const lesson = byTopic.get(topicCode)
      if (!lesson) return null
      return {
        code: topicCode,
        name: lesson.title,
        href: `/ib/courses/${routeSlug}/${lesson.slug}${workedAnchor(lesson)}`,
      }
    }
  }

  return (topicCode) => {
    const topic = getSyllabusTopicByCode(subjectCode, topicCode)
    if (!topic) return null
    const slug = topicToLessonSlug(topic.code, topic.name)
    const lesson = getCourseLesson(subjectCode, slug)
    if (!lesson) return null
    return {
      code: topic.code,
      name: lesson.title || topic.name,
      href: `/courses/${subjectCode}/${slug}${workedAnchor(lesson)}`,
    }
  }
}
