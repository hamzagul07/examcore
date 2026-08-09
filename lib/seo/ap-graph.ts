import { getApCourse, getApCourses, type ApCourse } from '@/lib/ap/catalog'
import { getExamSystem } from '@/lib/exam-systems'

const system = () => getExamSystem('ap')

/** AP owns /ap/* — College Board lifecycle, not A-Level Results Day. */
export function apRootPath(): string {
  return `/${system().routePrefix}`
}

export function apCoursePath(courseSlug: string): string {
  return `${apRootPath()}/${courseSlug}`
}

export function apScoreCalculatorPath(): string {
  return `${apRootPath()}/score-calculator`
}

export function resolveApCourse(courseSlug: string): ApCourse | null {
  return getApCourse(courseSlug)
}

export function getAllApCourseParams(): Array<{ course: string }> {
  return getApCourses().map((c) => ({ course: c.slug }))
}
