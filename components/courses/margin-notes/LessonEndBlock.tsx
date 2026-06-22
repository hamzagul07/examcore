'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MarginNote } from '@/components/courses/margin-notes/HandAnnotations'
import type { MarginNotesTopic } from '@/lib/courses/margin-notes/types'

type Props = {
  isDone: boolean
  celebrate: boolean
  onComplete: () => void
  prev?: MarginNotesTopic | null
  next?: MarginNotesTopic | null
  topicLink: (t: MarginNotesTopic) => string
  className?: string
  extra?: ReactNode
}

export function LessonEndBlock({
  isDone,
  celebrate,
  onComplete,
  prev,
  next,
  topicLink,
  className = 'lesson-end',
  extra,
}: Props) {
  return (
    <div className={className}>
      <button type="button" className={`complete-btn${isDone ? ' done' : ''}`} onClick={onComplete}>
        <span className="complete-box">{isDone ? '✓' : ''}</span>
        {isDone ? 'Topic complete — nice work' : 'Mark topic as complete'}
      </button>
      {celebrate ? (
        <MarginNote className="complete-note">nailed it — ring&apos;s filling up ✓</MarginNote>
      ) : null}
      <div className="prevnext">
        {prev ? (
          <Link className="pn-btn" href={topicLink(prev)}>
            <span className="micro">← PREVIOUS</span>
            <span className="pn-t serif">
              {prev.n} {prev.t}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="pn-btn right" href={topicLink(next)}>
            <span className="micro">NEXT →</span>
            <span className="pn-t serif">
              {next.n} {next.t}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      {extra}
    </div>
  )
}
