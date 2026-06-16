import { topicToLessonSlug } from '@/lib/courses/slug'
import { getSyllabusTree } from '@/lib/syllabi'
import type { ContinueLearning } from '@/lib/courses/margin-notes/types'
import { subjectAccent } from '@/lib/courses/margin-notes/subject-meta'

const PROGRESS_KEY = 'markscheme-course-progress'
const LAST_LESSON_KEY = 'markscheme-last-lesson'

export const COURSE_PROGRESS_CHANGED = 'markscheme-course-progress-changed'
export const COURSE_LAST_LESSON_CHANGED = 'markscheme-last-lesson-changed'

type ProgressMap = Record<string, Record<string, boolean>>

export type ContinueCatalogEntry = {
  code: string
  name: string
  lessonCount: number
  lessons: { slug: string; topicCode: string; title: string }[]
}

function readProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function readLastLesson(): { code: string; slug: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_LESSON_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { code: string; slug: string }
  } catch {
    return null
  }
}

export function saveLastLesson(code: string, slug: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_LESSON_KEY, JSON.stringify({ code, slug }))
    window.dispatchEvent(new CustomEvent(COURSE_LAST_LESSON_CHANGED))
  } catch {
    /* ignore */
  }
}

function unitLabelForTopic(code: string, topicCode: string): string {
  const tree = getSyllabusTree(code)
  if (!tree) return ''
  for (const group of tree) {
    const leaf = group.leaves.find((l) => l.code === topicCode)
    if (leaf) {
      return `Unit ${group.parent.code}${group.parent.name ? ` · ${group.parent.name}` : ''}`
    }
  }
  return ''
}

export function getContinueLearning(catalog: ContinueCatalogEntry[]): ContinueLearning | null {
  const last = readLastLesson()
  const progress = readProgress()

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

    return {
      code: entry.code,
      name: entry.name,
      acc: subjectAccent(entry.code),
      topicCode: target.topicCode,
      topicTitle: target.title,
      unitLabel: unitLabelForTopic(entry.code, target.topicCode),
      href: `/courses/${entry.code}/${target.slug}`,
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
  const progress = readProgress()
  const done = progress[code] ?? {}
  const doneCount = Object.values(done).filter(Boolean).length
  return lessonCount ? Math.round((doneCount / lessonCount) * 100) : 0
}

export function completedSlugsForSubject(code: string): Set<string> {
  const progress = readProgress()
  const subject = progress[code] ?? {}
  return new Set(Object.keys(subject).filter((k) => subject[k]))
}

/** Resolve active slug: last visited if incomplete, else first incomplete in list. */
export function resolveActiveSlug(code: string, lessonSlugs: string[]): string | null {
  const last = readLastLesson()
  const done = completedSlugsForSubject(code)
  if (last?.code === code && last.slug && lessonSlugs.includes(last.slug) && !done.has(last.slug)) {
    return last.slug
  }
  return lessonSlugs.find((s) => !done.has(s)) ?? null
}

export function topicHref(code: string, topicCode: string, topicName: string): string {
  return `/courses/${code}/${topicToLessonSlug(topicCode, topicName)}`
}
