import Link from 'next/link'
import { CheckCircle2, Sparkles } from 'lucide-react'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'

type Props = {
  subjectCode: string
  lessons: CourseLessonNav[]
  activeSlug?: string
  completedSlugs?: string[]
  /** When set, topic links keep the active paper filter. */
  paperQuery?: string | null
  /** Short label for the active paper group (hides long combined paper names). */
  paperGroupLabel?: string | null
}

function topicHref(
  subjectCode: string,
  slug: string,
  paperQuery?: string | null
): string {
  const base = `/courses/${subjectCode}/${slug}`
  if (!paperQuery) return base
  return `${base}?paper=${encodeURIComponent(paperQuery)}`
}

export function CourseTopicList({
  subjectCode,
  lessons,
  activeSlug,
  completedSlugs = [],
  paperQuery,
  paperGroupLabel,
}: Props) {
  const byPaper = lessons.reduce<Record<string, CourseLessonNav[]>>((acc, lesson) => {
    const key = paperGroupLabel ?? lesson.paperName
    if (!acc[key]) acc[key] = []
    acc[key].push(lesson)
    return acc
  }, {})

  const doneSet = new Set(completedSlugs)

  return (
    <nav aria-label="Course topics" className="course-studio-topic-nav">
      {Object.entries(byPaper).map(([paperName, paperLessons]) => (
        <div key={paperName} className="course-studio-paper-group">
          <p className="course-studio-paper-label">{paperName}</p>
          <ul className="course-studio-topic-list">
            {paperLessons.map((lesson) => {
              const isActive = lesson.slug === activeSlug
              const isDone = doneSet.has(lesson.slug)
              const isPublished =
                lesson.status === 'published' || lesson.status === 'premium'

              return (
                <li key={lesson.slug}>
                  <Link
                    href={topicHref(subjectCode, lesson.slug, paperQuery)}
                    className={`course-studio-topic-link${isActive ? ' is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="course-studio-topic-indicator" aria-hidden />
                    <span className="course-studio-topic-text min-w-0 flex-1">
                      <span className="course-studio-topic-title">{lesson.title}</span>
                      <span className="course-studio-topic-meta">
                        {lesson.topicCode}
                        {isPublished ? (
                          <span className="course-studio-topic-premium">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            Premium
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {isDone ? (
                      <CheckCircle2
                        className="course-studio-topic-done h-4 w-4 shrink-0"
                        aria-label="Completed"
                      />
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
