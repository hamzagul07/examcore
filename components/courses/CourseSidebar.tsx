'use client'

import Link from 'next/link'
import { BookOpen, GraduationCap } from 'lucide-react'
import { CourseProgressBar, useCourseProgress } from '@/components/courses/CourseProgressClient'
import { CourseTopicList } from '@/components/courses/CourseTopicList'
import type { CourseLesson } from '@/lib/courses/types'

export function CourseSidebar({
  subjectCode,
  subjectName,
  level,
  lessons,
  activeSlug,
}: {
  subjectCode: string
  subjectName: string
  level: string
  lessons: CourseLesson[]
  activeSlug?: string
}) {
  const { done } = useCourseProgress(subjectCode)
  const premiumCount = lessons.filter(
    (l) => l.status === 'published' || l.status === 'premium'
  ).length

  return (
    <aside className="course-studio-nav" aria-label="Course navigation">
      <div className="course-studio-subject-card">
        <div className="course-studio-subject-icon" aria-hidden>
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="course-studio-subject-meta min-w-0">
          <p className="course-studio-subject-name">{subjectName}</p>
          <div className="course-studio-tag-row">
            <span className="course-studio-tag">{subjectCode}</span>
            <span className="course-studio-tag">{level}</span>
            <span className="course-studio-tag course-studio-tag--muted">
              {premiumCount} premium
            </span>
          </div>
        </div>
      </div>

      <Link href={`/courses/${subjectCode}`} className="course-studio-dashboard-btn">
        <BookOpen className="h-4 w-4" aria-hidden />
        Course overview
      </Link>

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
