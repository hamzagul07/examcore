import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, BookOpen, Lightbulb, Target } from 'lucide-react'
import type { CourseLesson, LessonSection } from '@/lib/courses/types'

function CourseMarkdown({ content }: { content: string }) {
  return (
    <div className="ec-blog-prose min-w-0 text-[var(--ec-text-secondary)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function SectionBlock({ section }: { section: LessonSection }) {
  switch (section.type) {
    case 'intro':
      return (
        <p className="course-lesson-intro rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-5 py-4 text-lg leading-relaxed text-[var(--ec-text-secondary)]">
          {section.content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={i} className="font-semibold text-[var(--ec-text-primary)]">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      )
    case 'heading':
      return (
        <h2 className="course-lesson-h2 mt-10 text-xl font-semibold tracking-tight text-[var(--ec-text-primary)] first:mt-0">
          {section.content}
        </h2>
      )
    case 'text':
      return <CourseMarkdown content={section.content} />
    case 'formula':
      return (
        <div
          className="rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-5 py-4 font-mono text-sm leading-relaxed text-[var(--ec-text-primary)]"
          role="math"
        >
          {section.content}
        </div>
      )
    case 'keyPoints':
      return (
        <ul className="course-key-points space-y-2">
          {section.items.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--ec-text-secondary)]"
            >
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-accent)]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'examTip':
      return (
        <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="mb-1 font-semibold text-[var(--ec-text-primary)]">Exam tip</p>
            <p>{section.content}</p>
          </div>
        </div>
      )
    case 'workedExample':
      return (
        <div className="overflow-hidden rounded-2xl border border-[var(--ec-border-subtle)]">
          <div className="border-b border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--ec-text-tertiary)]">
              Worked example
            </p>
            <p className="mt-1 font-medium text-[var(--ec-text-primary)]">{section.question}</p>
          </div>
          <pre className="whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {section.solution}
          </pre>
        </div>
      )
    case 'practice':
      return (
        <Link
          href={section.href}
          className="ec-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold no-underline"
        >
          {section.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )
    case 'resources':
      return (
        <div className="rounded-2xl border border-[var(--ec-border-subtle)] p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ec-text-primary)]">
            <BookOpen className="h-4 w-4" aria-hidden />
            Go deeper
          </p>
          <ul className="space-y-2">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-[var(--ec-accent)] underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )
    default:
      return null
  }
}

export function CourseLessonContent({ lesson }: { lesson: CourseLesson }) {
  return (
    <div className="course-lesson-body space-y-5">
      {lesson.sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}
    </div>
  )
}
