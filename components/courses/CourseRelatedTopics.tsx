import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { CourseLesson } from '@/lib/courses/types'

export function CourseRelatedTopics({
  subjectCode,
  subjectName,
  lessons,
  currentSlug,
}: {
  subjectCode: string
  subjectName: string
  lessons: CourseLesson[]
  currentSlug: string
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
      className="mt-10 rounded-2xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-5"
      aria-labelledby="related-topics"
    >
      <h2 id="related-topics" className="mb-1 text-lg font-semibold text-[var(--ec-text-primary)]">
        More {subjectName} topics
      </h2>
      <p className="mb-4 text-sm text-[var(--ec-text-tertiary)]">
        Students revising this topic also study these syllabus points on {subjectCode}.
      </p>
      <ul className="divide-y divide-[var(--ec-border-subtle)] rounded-xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)]">
        {related.map((lesson) => (
          <li key={lesson.slug}>
            <Link
              href={`/courses/${subjectCode}/${lesson.slug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm no-underline transition-colors hover:bg-[var(--ec-surface-muted)]"
            >
              <span>
                <span className="font-mono text-xs text-[var(--ec-text-tertiary)]">
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
