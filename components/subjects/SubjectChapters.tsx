import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { CourseLesson } from '@/lib/courses/types'

/**
 * "Inside subject" chapter browser — a clean grid of every topic/chapter in a
 * course, linking straight to the lesson (the ZNotes-style chapters view). Used
 * on the Cambridge and IB subject pages. `basePath` is '/courses' or '/ib/courses'.
 */
export function SubjectChapters({
  code,
  lessons,
  basePath = '/courses',
  accent = 'var(--ec-brand)',
  heading = 'Course chapters',
}: {
  code: string
  lessons: CourseLesson[]
  basePath?: string
  accent?: string
  heading?: string
}) {
  if (!lessons.length) return null
  const ordered = [...lessons].sort((a, b) =>
    a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true })
  )
  return (
    <section
      className="subj-chapters"
      aria-labelledby="subj-chapters-h"
      style={{ '--sc': accent } as CSSProperties}
    >
      <div className="subj-chapters-head">
        <h2 id="subj-chapters-h" className="ms-h3">
          {heading}
        </h2>
        <span className="ms-micro">{ordered.length} topics · free</span>
      </div>
      <ul className="subj-chapter-grid">
        {ordered.map((l, i) => (
          <li key={l.slug}>
            <Link href={`${basePath}/${code}/${l.slug}`} className="subj-chapter">
              <span className="subj-chapter-n mono">{l.topicCode || String(i + 1)}</span>
              <span className="subj-chapter-title">{l.title}</span>
              <span className="subj-chapter-go" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
