import type { CourseLesson, CourseSubject } from '@/lib/courses/types'

const lessonsBySubject = new Map<string, CourseLesson[]>()
const subjectByCode = new Map<string, CourseSubject | null>()

export function readLessonsCache(subjectCode: string): CourseLesson[] | undefined {
  return lessonsBySubject.get(subjectCode)
}

export function writeLessonsCache(subjectCode: string, lessons: CourseLesson[]): CourseLesson[] {
  lessonsBySubject.set(subjectCode, lessons)
  return lessons
}

export function readSubjectCache(code: string): CourseSubject | null | undefined {
  if (!subjectByCode.has(code)) return undefined
  return subjectByCode.get(code) ?? null
}

export function writeSubjectCache(code: string, subject: CourseSubject | null): CourseSubject | null {
  subjectByCode.set(code, subject)
  return subject
}

/** Test helper — clears in-process catalog memoization. */
export function clearCourseCatalogCache(): void {
  lessonsBySubject.clear()
  subjectByCode.clear()
}
