'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Lightbulb, Target } from 'lucide-react'
import { MathText } from '@/components/MathText'
import { CourseLessonMarkdown } from '@/components/courses/CourseLessonMarkdown'
import { prepareCourseMathMarkdown } from '@/lib/courses/math-format'
import type { CourseLesson, LessonSection } from '@/lib/courses/types'

function SectionBlock({ section }: { section: LessonSection }) {
  switch (section.type) {
    case 'intro':
      return (
        <div className="course-lesson-intro rounded-2xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-5 py-4">
          <CourseLessonMarkdown content={section.content} />
        </div>
      )
    case 'heading':
      return (
        <h2 className="course-lesson-h2 mt-10 text-xl font-semibold tracking-tight text-[var(--ec-text-primary)] first:mt-0">
          {section.content}
        </h2>
      )
    case 'text':
      return <CourseLessonMarkdown content={section.content} />
    case 'formula':
      return (
        <div
          className="course-lesson-formula rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_30%,var(--ec-border-subtle))] bg-[var(--ec-surface-muted)] px-5 py-5"
          role="math"
        >
          <CourseLessonMarkdown content={prepareCourseMathMarkdown(section.content)} />
        </div>
      )
    case 'keyPoints':
      return (
        <ul className="course-key-points space-y-2">
          {section.items.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-4 py-3 text-sm leading-relaxed text-[var(--ec-text-secondary)]"
            >
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-accent)]" aria-hidden />
              <MathText text={item} />
            </li>
          ))}
        </ul>
      )
    case 'examTip':
      return (
        <div className="flex gap-3 rounded-2xl border-2 border-amber-500/35 bg-amber-500/8 px-4 py-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="mb-1 font-semibold text-[var(--ec-text-primary)]">Exam tip</p>
            <MathText text={section.content} />
          </div>
        </div>
      )
    case 'workedExample':
      return (
        <div className="course-worked-box overflow-hidden">
          <div className="course-worked-header px-4 py-3 sm:px-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--ec-accent)]">
              Worked example
            </p>
            <div className="mt-2 font-medium text-[var(--ec-text-primary)]">
              <MathText text={section.question} />
            </div>
          </div>
          <div className="border-t-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-4 py-4 sm:px-5">
            <CourseLessonMarkdown content={section.solution.replace(/\n/g, '\n\n')} />
          </div>
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
        <div className="rounded-2xl border-2 border-[var(--ec-border-subtle)] p-4">
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
    <div className="course-lesson-body w-full min-w-0 max-w-none space-y-5">
      {lesson.sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}
    </div>
  )
}
