import { getCourseLessons } from '@/lib/courses'

export function countCourseUnits(code: string): number {
  const lessons = getCourseLessons(code)
  const papers = new Set(lessons.map((l) => l.paperName))
  return papers.size || Math.max(1, Math.ceil(lessons.length / 6))
}

export function courseCatalogMeta(course: {
  lessonCount: number
  publishedCount: number
}): string {
  const lessons =
    course.publishedCount > 0 ? course.publishedCount : course.lessonCount
  const questions =
    course.publishedCount > 0
      ? Math.round(course.publishedCount * 5.8)
      : Math.round(course.lessonCount * 2)
  return `${lessons} lessons · ${questions} past-paper questions`
}

export type CourseCatalogEntry = {
  code: string
  name: string
  level: string
  lessonCount: number
  publishedCount: number
  path: string
  units: number
  meta: string
  glyph: string
  color: string
}
