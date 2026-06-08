'use client'

import { CourseRichText } from '@/components/courses/CourseRichText'

export function CourseLessonMarkdown({ content }: { content: string }) {
  return <CourseRichText content={content} variant="prose" className="course-lesson-prose" />
}
