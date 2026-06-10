'use client'

import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import type { CourseCatalogEntry } from '@/lib/courses/catalog-display'
import { useCourseProgress } from '@/components/courses/CourseProgressClient'

export function CourseCatalogCard({ course }: { course: CourseCatalogEntry }) {
  const router = useRouter()
  const { done } = useCourseProgress(course.code)
  const progress =
    course.lessonCount > 0
      ? Math.min(100, Math.round((done.size / course.lessonCount) * 100))
      : 0

  return (
    <div
      role="link"
      tabIndex={0}
      className="ms-scard2"
      style={{ '--sc': course.color } as CSSProperties}
      onClick={() => router.push(course.path)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(course.path)
        }
      }}
    >
      <div className="ms-tile">
        <span className="ms-tg" aria-hidden>
          {course.glyph}
        </span>
        <span className="ms-badge">
          {progress > 0 ? `${progress}% COVERED` : 'START FREE'}
        </span>
      </div>
      <div className="ms-body">
        <h2 className="ms-sname">{course.name}</h2>
        <span className="ms-scode">
          {course.code} · CAIE · {course.units} units
        </span>
        <p className="ms-body-2">{course.meta}</p>
        <div className="ms-prog-track" aria-hidden>
          <div className="ms-prog-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="ms-stat-row" style={{ marginTop: 8 }}>
          <span>
            <b>FREE</b> FOREVER
          </span>
          <span>FLASHCARDS · TIPS · PRACTICE</span>
        </div>
      </div>
    </div>
  )
}
