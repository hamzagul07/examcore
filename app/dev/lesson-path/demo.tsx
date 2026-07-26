'use client'

import { useMemo } from 'react'
import type { CourseLesson } from '@/lib/courses/types'
import type { EnrichedVisualLesson } from '@/lib/courses/visual-types'
import { adaptLesson } from '@/lib/courses/margin-notes/adapt-lesson'
import { LessonPath } from '@/components/courses/path/LessonPath'

/**
 * Adapts on the client for the same reason CourseLessonClient does: adaptLesson
 * pulls in the diagram registries, which are client modules.
 */
export function LessonPathDemo({
  subjectCode,
  lesson,
  enriched,
}: {
  subjectCode: string
  lesson: CourseLesson
  enriched: EnrichedVisualLesson
}) {
  const adapted = useMemo(
    () => adaptLesson(subjectCode, 'Biology', lesson, [], [], { enriched }),
    [subjectCode, lesson, enriched]
  )
  return (
    <div className="course-root lpath-root">
      <p className="ec-label-tech lpath-flag">
        DEV PREVIEW · LESSON AS A PATH — compare with /ib/courses/biology-hl/a2-2-cell-structure
      </p>
      <LessonPath lesson={adapted} />
    </div>
  )
}
