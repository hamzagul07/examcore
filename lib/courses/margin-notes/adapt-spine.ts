import type { CourseLesson } from '@/lib/courses/types'
import type { MarginNotesTopic } from '@/lib/courses/margin-notes/types'

export function lessonToTopic(lesson: CourseLesson, opts?: { done?: boolean; active?: boolean }): MarginNotesTopic {
  return {
    n: lesson.topicCode,
    t: lesson.title,
    slug: lesson.slug,
    done: opts?.done,
    active: opts?.active,
  }
}

export function buildFlatTopics(
  lessons: CourseLesson[],
  completedSlugs: Set<string>,
  activeSlug?: string | null
): MarginNotesTopic[] {
  return lessons.map((lesson) =>
    lessonToTopic(lesson, {
      done: completedSlugs.has(lesson.slug),
      active: lesson.slug === activeSlug,
    })
  )
}

export function topicNeighbors(
  flat: MarginNotesTopic[],
  topicCode: string
): { idx: number; prev: MarginNotesTopic | null; next: MarginNotesTopic | null; related: MarginNotesTopic[] } {
  const idx = flat.findIndex((t) => t.n === topicCode)
  const prev = idx > 0 ? flat[idx - 1] : null
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null
  const related =
    idx >= 0
      ? flat.filter((_, i) => i !== idx).slice(Math.max(0, idx - 1), idx + 3).slice(0, 4)
      : []
  return { idx, prev, next, related }
}
