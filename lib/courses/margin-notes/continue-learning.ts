import { topicToLessonSlug } from '@/lib/courses/slug'
import { getSyllabusTree } from '@/lib/syllabi'
import type { ContinueLearning } from '@/lib/courses/margin-notes/types'
import { subjectAccent } from '@/lib/courses/margin-notes/subject-meta'
import {
  readLocalLastLesson,
  readLocalProgress,
  writeLocalLastLesson,
  COURSE_LAST_LESSON_CHANGED,
  COURSE_PROGRESS_CHANGED,
} from '@/lib/courses/course-progress-storage'
import { scheduleCloudProgressPush } from '@/lib/courses/course-progress-cloud'

export {
  COURSE_PROGRESS_CHANGED,
  COURSE_LAST_LESSON_CHANGED,
} from '@/lib/courses/course-progress-storage'

export type ContinueCatalogEntry = {
  code: string
  name: string
  lessonCount: number
  lessons: { slug: string; topicCode: string; title: string }[]
  /** Lesson URL prefix — default `/courses`. IB uses `/ib/courses`. */
  basePath?: string
  /** Syllabus registry code when different from `code` (IB: `ib-tok`). */
  syllabusCode?: string
}

function unitLabelForTopic(code: string, topicCode: string, syllabusCode?: string): string {
  const tree = getSyllabusTree(syllabusCode ?? code)
  if (!tree) return ''
  for (const group of tree) {
    const leaf = group.leaves.find((l) => l.code === topicCode)
    if (leaf) {
      return `Unit ${group.parent.code}${group.parent.name ? ` · ${group.parent.name}` : ''}`
    }
  }
  return ''
}

export function saveLastLesson(code: string, slug: string) {
  writeLocalLastLesson(code, slug)
  scheduleCloudProgressPush()
}

export function getContinueLearning(catalog: ContinueCatalogEntry[]): ContinueLearning | null {
  const last = readLocalLastLesson()
  const progress = readLocalProgress()

  const pickFromCode = (entry: ContinueCatalogEntry, slug?: string): ContinueLearning | null => {
    const done = progress[entry.code] ?? {}
    const doneCount = Object.values(done).filter(Boolean).length
    const prog = entry.lessonCount
      ? Math.round((doneCount / entry.lessonCount) * 100)
      : 0

    let target = slug ? entry.lessons.find((l) => l.slug === slug) : null
    if (!target) {
      target = entry.lessons.find((l) => !done[l.slug]) ?? entry.lessons[0]
    }
    if (!target) return null

    const base = entry.basePath ?? '/courses'
    return {
      code: entry.code,
      name: entry.name,
      acc: subjectAccent(entry.syllabusCode ?? entry.code),
      topicCode: target.topicCode,
      topicTitle: target.title,
      unitLabel: unitLabelForTopic(entry.code, target.topicCode, entry.syllabusCode),
      href: `${base}/${entry.code}/${target.slug}`,
      prog,
    }
  }

  if (last) {
    const course = catalog.find((c) => c.code === last.code)
    if (course) {
      const fromLast = pickFromCode(course, last.slug)
      if (fromLast) return fromLast
    }
  }

  for (const course of catalog) {
    const done = progress[course.code] ?? {}
    if (Object.values(done).some(Boolean)) {
      const cont = pickFromCode(course)
      if (cont) return cont
    }
  }

  return null
}

export function subjectProgressPercent(code: string, lessonCount: number): number {
  const progress = readLocalProgress()
  const done = progress[code] ?? {}
  const doneCount = Object.values(done).filter(Boolean).length
  return lessonCount ? Math.round((doneCount / lessonCount) * 100) : 0
}

export function completedSlugsForSubject(code: string): Set<string> {
  const progress = readLocalProgress()
  const subject = progress[code] ?? {}
  return new Set(Object.keys(subject).filter((k) => subject[k]))
}

/** Resolve active slug: last visited if incomplete, else first incomplete in list. */
export function resolveActiveSlug(code: string, lessonSlugs: string[]): string | null {
  const last = readLocalLastLesson()
  const done = completedSlugsForSubject(code)
  if (last?.code === code && last.slug && lessonSlugs.includes(last.slug) && !done.has(last.slug)) {
    return last.slug
  }
  return lessonSlugs.find((s) => !done.has(s)) ?? null
}

export function topicHref(code: string, topicCode: string, topicName: string): string {
  return `/courses/${code}/${topicToLessonSlug(topicCode, topicName)}`
}
