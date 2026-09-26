'use client'

import { useEffect, useId, useRef } from 'react'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { postFeedbackRead } from '@/lib/student/feedback-read'

export type TeacherFeedbackNoteReview = {
  stamp: 'OV' | 'OK'
  /** "Re-marked by your teacher: 6 → 7" */
  headline: string
  /** "out of 9", "7/9 stands" */
  detail: string | null
  /** The teacher's note on the decision, plain text. */
  note: string | null
  teacher_display_name: string
  reviewed_at: string
}

export type TeacherFeedbackNoteItem = {
  id: string
  body: string
  created_at: string
  read_at: string | null
  teacher_display_name: string
}

/**
 * The teacher's word on one marked attempt, on the student's attempt page
 * (docs/TEACHER_SYSTEM_SPEC.md §4 `/dashboard/attempt/[id]`): a visible
 * re-mark or confirmation ("Re-marked by your teacher: 6 → 7") and any notes
 * they wrote, as handwritten `.ms-feedback-note` slips.
 *
 * Everything shown here was already filtered to what the student may see
 * (lib/student/assignments.ts loadAttemptTeacherNotes: RLS drops private
 * decisions, flags never show). Notes are plain text and rendered as text.
 * Notes that were unread when the page rendered are marked read once, after
 * they have been shown (`/api/feedback/read`), and carry a "New" tag for this
 * view.
 */
export function TeacherFeedbackNote({
  review,
  notes,
  timeZone,
}: {
  review: TeacherFeedbackNoteReview | null
  notes: TeacherFeedbackNoteItem[]
  /** The server's time-zone guess for the first paint (see LocalTime). */
  timeZone?: string
}) {
  const titleId = useId()
  const sentRef = useRef(false)
  const unreadKey = notes
    .filter((n) => !n.read_at)
    .map((n) => n.id)
    .join(',')

  useEffect(() => {
    if (sentRef.current || !unreadKey) return
    sentRef.current = true
    void postFeedbackRead(unreadKey.split(','))
  }, [unreadKey])

  if (!review && notes.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="mb-8 space-y-3">
      <h2 id={titleId} className="ms-overline mb-1">
        From your teacher
      </h2>
      {review ? (
        <aside className="ms-feedback-note">
          <p className="ms-feedback-note__label flex flex-wrap items-center gap-2">
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              {review.stamp}
            </span>
            <span>{review.headline}</span>
          </p>
          {review.note ? <p className="ms-feedback-note__body">{review.note}</p> : null}
          <p className="ms-feedback-note__meta">
            {[review.detail, review.teacher_display_name].filter(Boolean).join(' · ')}
            {' · '}
            <LocalTime iso={review.reviewed_at} variant="date" timeZone={timeZone} />
          </p>
        </aside>
      ) : null}
      {notes.map((n) => (
        <aside key={n.id} className="ms-feedback-note">
          <p className="ms-feedback-note__label">
            From {n.teacher_display_name}
            {n.read_at ? null : <span className="ml-2 text-[var(--ec-ink-crimson)]">· New</span>}
          </p>
          <p className="ms-feedback-note__body">{n.body}</p>
          <p className="ms-feedback-note__meta">
            <LocalTime iso={n.created_at} variant="date" timeZone={timeZone} />
          </p>
        </aside>
      ))}
    </section>
  )
}
