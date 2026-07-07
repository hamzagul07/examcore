'use client'

import Link from 'next/link'
import { CourseProgressBar, useCourseProgress } from '@/components/courses/CourseProgressClient'
import { CoursePaperPicker } from '@/components/courses/CoursePaperPicker'
import { CourseTopicList } from '@/components/courses/CourseTopicList'
import { useCoursePaperSelection } from '@/components/courses/useCoursePaperSelection'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'

export function CourseSidebar({
  subjectCode,
  subjectName,
  lessons,
  activeSlug,
}: {
  subjectCode: string
  subjectName: string
  level: string
  lessons: CourseLessonNav[]
  activeSlug?: string
}) {
  const { done } = useCourseProgress(subjectCode)
  const { tracks, activeTrack, selectedNumber, filteredLessons, hasPaperChoice } =
    useCoursePaperSelection(subjectCode, lessons)
  const displayLessons = hasPaperChoice ? filteredLessons : lessons

  const overviewHref = selectedNumber
    ? `/courses/${subjectCode}?paper=${encodeURIComponent(selectedNumber)}`
    : `/courses/${subjectCode}`

  return (
    <aside className="course-studio-nav" aria-label="Course navigation">
      <div style={{ padding: '0 18px 10px' }}>
        <Link href={overviewHref} className="course-studio-dashboard-btn" style={{ margin: 0 }}>
          ← {subjectName}
        </Link>
      </div>

      {hasPaperChoice ? (
        <CoursePaperPicker
          subjectCode={subjectCode}
          tracks={tracks}
          selectedNumber={selectedNumber}
          compact
        />
      ) : null}

      <CourseProgressBar subjectCode={subjectCode} total={displayLessons.length} />

      <CourseTopicList
        subjectCode={subjectCode}
        lessons={displayLessons}
        activeSlug={activeSlug}
        completedSlugs={[...done]}
        paperQuery={selectedNumber}
        paperGroupLabel={activeTrack?.shortName ?? null}
      />
    </aside>
  )
}
