import type { ReactNode } from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { CourseFocusMode } from '@/components/courses/CourseFocusMode'
import { CourseSidebar } from '@/components/courses/CourseSidebar'
import { CourseBreadcrumbs } from '@/components/courses/CourseBreadcrumbs'
import { CourseStudioShareButton } from '@/components/courses/CourseStudioShareButton'
import type { CourseLesson } from '@/lib/courses/types'
import { getSubjectTheme } from '@/lib/courses/subject-theme'

type Breadcrumb = { name: string; path: string }

type Props = {
  children: ReactNode
  subjectCode: string
  subjectName: string
  level: string
  lessons: CourseLesson[]
  activeSlug?: string
  breadcrumbs?: Breadcrumb[]
  markHref?: string
  topSlot?: ReactNode
}

export function CourseStudioShell({
  children,
  subjectCode,
  subjectName,
  level,
  lessons,
  activeSlug,
  breadcrumbs,
  markHref,
  topSlot,
}: Props) {
  const theme = getSubjectTheme(subjectCode)

  return (
    <CourseFocusMode>
      <div
        className="course-studio"
        data-subject={subjectCode}
        style={
          {
            '--course-accent': theme.accent,
            '--course-subject-accent': theme.accent,
            '--course-subject-accent-soft': theme.accentSoft,
            '--course-accent-muted': `color-mix(in srgb, ${theme.accent} 14%, transparent)`,
          } as Record<string, string>
        }
      >
        <div className="course-studio-grid">
          <Suspense
            fallback={
              <aside className="course-studio-nav" aria-label="Course navigation" />
            }
          >
            <CourseSidebar
              subjectCode={subjectCode}
              subjectName={subjectName}
              level={level}
              lessons={lessons}
              activeSlug={activeSlug}
            />
          </Suspense>

          <div className="course-studio-main min-w-0">
            {breadcrumbs?.length ? (
              <header className="course-studio-topbar">
                <CourseBreadcrumbs items={breadcrumbs} />
                <div className="course-studio-topbar-actions">
                  {topSlot}
                  {markHref ? (
                    <Link href={markHref} className="course-studio-mark-cta">
                      <span className="course-studio-mark-dot" aria-hidden />
                      <PenLine className="h-4 w-4" aria-hidden />
                      Mark this topic
                    </Link>
                  ) : null}
                  <CourseStudioShareButton />
                </div>
              </header>
            ) : null}

            <div className="course-studio-content">{children}</div>
          </div>
        </div>
      </div>
    </CourseFocusMode>
  )
}
