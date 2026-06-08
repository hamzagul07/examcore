import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { CourseLesson } from '@/lib/courses/types'

export function CourseRelatedTopics({
  subjectCode,
  subjectName,
  lessons,
  currentSlug,
  nextLesson,
}: {
  subjectCode: string
  subjectName: string
  lessons: CourseLesson[]
  currentSlug: string
  nextLesson?: CourseLesson | null
}) {
  const idx = lessons.findIndex((l) => l.slug === currentSlug)
  if (idx < 0) return null

  const related: CourseLesson[] = []
  for (let i = Math.max(0, idx - 2); i <= Math.min(lessons.length - 1, idx + 2); i++) {
    if (i !== idx) related.push(lessons[i])
  }

  if (!related.length) return null

  return (
    <section
      className="course-keep-going mt-10"
      aria-labelledby="related-topics"
    >
      <div className="course-keep-going-divider" aria-hidden />
      {nextLesson ? (
        <p className="course-keep-going-next">
          Next: <strong>{nextLesson.topicCode}</strong> {nextLesson.title}
        </p>
      ) : null}
      <h2 id="related-topics" className="course-keep-going-title">
        Keep going
      </h2>
      <p className="mb-4 text-sm text-[var(--ec-text-tertiary)]">
        More {subjectName} topics students revise alongside this syllabus point ({subjectCode}).
      </p>
      <ul className="divide-y divide-[var(--ec-border-subtle)] rounded-xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)]">
        {related.map((lesson) => (
          <li key={lesson.slug}>
            <Link
              href={`/courses/${subjectCode}/${lesson.slug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm no-underline transition-colors hover:bg-[var(--ec-surface-muted)]"
            >
              <span>
                <span className="font-mono text-xs font-semibold text-[var(--course-subject-accent,var(--ec-brand))]">
                  {lesson.topicCode}
                </span>
                <span className="ml-2 font-medium text-[var(--ec-text-primary)]">
                  {lesson.title}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ec-accent)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
