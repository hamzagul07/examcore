import type { CourseLesson } from '@/lib/courses/types'

/** Fields required for sidebar / paper tabs - omit heavy section bodies from RSC payload. */
export type CourseLessonNav = Pick<
  CourseLesson,
  'slug' | 'topicCode' | 'title' | 'paper' | 'paperName' | 'status'
>

export function stripLessonsForNav(lessons: CourseLesson[]): CourseLessonNav[] {
  return lessons.map(({ slug, topicCode, title, paper, paperName, status }) => ({
    slug,
    topicCode,
    title,
    paper,
    paperName,
    status,
  }))
}
