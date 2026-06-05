import Link from 'next/link'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'
import type { CourseLesson } from '@/lib/courses/types'

type Props = {
  subjectCode: string
  lessons: CourseLesson[]
  activeSlug?: string
  completedSlugs?: string[]
}

export function CourseTopicList({
  subjectCode,
  lessons,
  activeSlug,
  completedSlugs = [],
}: Props) {
  const byPaper = lessons.reduce<Record<string, CourseLesson[]>>((acc, lesson) => {
    const key = lesson.paperName
    if (!acc[key]) acc[key] = []
    acc[key].push(lesson)
    return acc
  }, {})

  const doneSet = new Set(completedSlugs)

  return (
    <nav aria-label="Course topics" className="space-y-6">
      {Object.entries(byPaper).map(([paperName, paperLessons]) => (
        <div key={paperName}>
          <p className="ec-label-tech mb-2 px-1">{paperName}</p>
          <ul className="space-y-1">
            {paperLessons.map((lesson) => {
              const isActive = lesson.slug === activeSlug
              const isDone = doneSet.has(lesson.slug)
              const isPublished =
                lesson.status === 'published' || lesson.status === 'premium'

              return (
                <li key={lesson.slug}>
                  <Link
                    href={`/courses/${subjectCode}/${lesson.slug}`}
                    className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-[var(--ec-accent)]/12 font-medium text-[var(--ec-text-primary)]'
                        : 'text-[var(--ec-text-secondary)] hover:bg-[var(--ec-surface-raised)]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isDone ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                        aria-label="Completed"
                      />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 opacity-35" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{lesson.title}</span>
                      <span className="text-xs text-[var(--ec-text-tertiary)]">
                        {lesson.topicCode}
                        {isPublished ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[var(--ec-accent)]">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            Premium lesson
                          </span>
                        ) : null}
                      </span>
                    </span>
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
