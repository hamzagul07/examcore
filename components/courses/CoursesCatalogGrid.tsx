'use client'

import type { CourseCatalogEntry } from '@/lib/courses/catalog-display'
import { CourseCatalogCard } from '@/components/courses/CourseCatalogCard'

export function CoursesCatalogGrid({ courses }: { courses: CourseCatalogEntry[] }) {
  return (
    <div className="ms-courses-catalog ms-course-catalog">
      {courses.map((course) => (
        <CourseCatalogCard key={course.code} course={course} />
      ))}
    </div>
  )
}
