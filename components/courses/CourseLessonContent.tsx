'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { CourseCallout } from '@/components/courses/CourseCallout'
import { CourseWorkedExampleReveal } from '@/components/courses/CourseWorkedExampleReveal'
import { prepareCourseMathMarkdown } from '@/lib/courses/math-format'
import { headingToId } from '@/lib/courses/lesson-toc'
import type { CourseLesson, LessonSection } from '@/lib/courses/types'

function SectionBlock({ section, index }: { section: LessonSection; index: number }) {
  switch (section.type) {
    case 'intro':
      return (
        <CourseCallout variant="note">
          <CourseRichText content={section.content} variant="prose" />
        </CourseCallout>
      )
    case 'heading':
      return (
        <h2
          id={headingToId(section.content, index)}
          className="course-lesson-h2 scroll-mt-28"
        >
          {section.content}
        </h2>
      )
    case 'text':
      return (
        <div className="course-reading-prose">
          <CourseRichText content={section.content} variant="prose" />
        </div>
      )
    case 'formula':
      return (
        <CourseCallout variant="formula">
          <div className="course-formula-display" role="math">
            <CourseRichText
              content={prepareCourseMathMarkdown(section.content)}
              variant="formula"
            />
          </div>
        </CourseCallout>
      )
    case 'keyPoints':
      return null
    case 'examTip':
      return (
        <CourseCallout variant="exam-tip">
          <CourseRichText content={section.content} variant="prose" />
        </CourseCallout>
      )
    case 'workedExample':
      return (
        <CourseWorkedExampleReveal question={section.question} solution={section.solution} />
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
        <CourseCallout variant="reading" title="Go deeper">
          <ul className="course-reading-links">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </CourseCallout>
      )
    default:
      return null
  }
}

export function CourseLessonContent({ lesson }: { lesson: CourseLesson }) {
  return (
    <article className="course-lesson-body course-reading-column">
      {lesson.sections.map((section, i) => (
        <SectionBlock key={i} section={section} index={i} />
      ))}
    </article>
  )
}
