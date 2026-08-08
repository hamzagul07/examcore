/**
 * Expand topic-practice coverage beyond the mark_schemes-tagged cache.
 * For syllabus codes with course lessons but few/no cached question pages,
 * emit indexable topic hubs that deep-link into the CAIE graph + /mark.
 * Does not invent past-paper stems (copyright-safe).
 */
import { getCourseLessons, getCourseSubjectCodes } from '@/lib/courses'
import { isIndexableLesson } from '@/lib/seo/caie-graph'
import {
  getTopicQuestionPages,
  getTopicQuestionSubjectCodes,
  type TopicQuestionPage,
} from '@/lib/seo/topic-questions'
import { topicToLessonSlug } from '@/lib/courses/slug'

function topicSlugFromLesson(slug: string): string {
  return slug.replace(/^[0-9]+-[0-9]+[a-z]?-/, '') || slug
}

export function getExpandedTopicQuestionPages(code: string): TopicQuestionPage[] {
  const cached = getTopicQuestionPages(code)
  const cachedSlugs = new Set(cached.map((t) => t.topicSlug))
  const extras: TopicQuestionPage[] = []

  for (const lesson of getCourseLessons(code)) {
    if (!isIndexableLesson(lesson)) continue
    const topicSlug = topicSlugFromLesson(lesson.slug)
    if (cachedSlugs.has(topicSlug) || cachedSlugs.has(lesson.slug)) continue
    extras.push({
      topicCode: lesson.topicCode,
      topicSlug,
      lessonSlug: lesson.slug || topicToLessonSlug(lesson.topicCode, lesson.title),
      title: lesson.title,
      questionCount: 0,
      questions: [],
    })
  }

  return [...cached, ...extras]
}

export function getAllExpandedTopicQuestionParams(): { code: string; topic: string }[] {
  const codes = new Set([
    ...getCourseSubjectCodes(),
    ...getTopicQuestionSubjectCodes(),
  ])
  const out: { code: string; topic: string }[] = []
  for (const code of codes) {
    for (const page of getExpandedTopicQuestionPages(code)) {
      out.push({ code, topic: page.topicSlug })
    }
  }
  return out
}

export function getExpandedTopicQuestionPage(
  code: string,
  topicSlug: string
): TopicQuestionPage | null {
  return (
    getExpandedTopicQuestionPages(code).find((t) => t.topicSlug === topicSlug) ??
    null
  )
}
