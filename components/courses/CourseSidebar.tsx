'use client'

import { CourseProgressBar, useCourseProgress } from '@/components/courses/CourseProgressClient'
import { CourseTopicList } from '@/components/courses/CourseTopicList'
import type { CourseLesson } from '@/lib/courses/types'

export function CourseSidebar({
  subjectCode,
  lessons,
  activeSlug,
}: {
  subjectCode: string
  lessons: CourseLesson[]
  activeSlug?: string
}) {
  const { done } = useCourseProgress(subjectCode)

  return (
    <aside className="space-y-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <CourseProgressBar subjectCode={subjectCode} total={lessons.length} />
      <CourseTopicList
        subjectCode={subjectCode}
        lessons={lessons}
        activeSlug={activeSlug}
        completedSlugs={[...done]}
      />
    </aside>
  )
}
