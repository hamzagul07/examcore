'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MathText } from '@/components/MathText'
import { reviewHref, setHref, studentHref } from '@/components/teacher/assignments/links'
import { DECISION_BADGE, marksLine, relativeDay } from '@/lib/teacher/insights/format'
import type { StudentHistoryRow } from '@/lib/teacher/insights/history'

export type StudentHistoryPageData = { attempts: StudentHistoryRow[]; next_cursor: string | null }

/**
 * One student's marked work in this class, newest first (spec §4
 * `.../students/[studentId]`: StudentAttemptHistory, from
 * `T/students/[sid]/history`, with OV / OK / FLG badges for the teacher's
 * decisions).
 *
 * The first page is rendered on the server and passed in; "Load more" asks
 * the history route for the next page with its cursor, so the browser only
 * ever holds the pages the teacher asked for. Every row links to the script
 * in the review console and — when the page has a note composer (`canNote`:
 * TEACHER_V2 on and a live member) — to that composer. The
 * question preview is a one-line reminder of which question it was (maths
 * typeset, a formula cut short left as text) — never the mark scheme.
 */
export function StudentAttemptHistory({
  classroomId,
  studentId,
  firstName,
  initial,
  error = null,
  selectedAttemptId = null,
  canNote = false,
  nowMs,
  headingId = 'student-history-title',
}: {
  classroomId: string
  studentId: string
  /** "Amira" — for headings. */
  firstName: string
  /** The first page, loaded on the server; null when it failed. */
  initial: StudentHistoryPageData | null
  error?: string | null
  /** The script the note composer below is on. */
  selectedAttemptId?: string | null
  /**
   * Whether this page has a note composer to point at. Without one (TEACHER_V2
   * off) a "Note" link would only reload the page, so rows offer Review alone.
   */
  canNote?: boolean
  /** When the page was computed, so "yesterday" agrees on server and client. */
  nowMs: number
  headingId?: string
}) {
  const [rows, setRows] = useState<StudentHistoryRow[]>(initial?.attempts ?? [])
  const [cursor, setCursor] = useState<string | null>(initial?.next_cursor ?? null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState('')

  async function loadMore() {
    if (!cursor || loading) return
    setLoading(true)
    setLoadError('')
    setStatus('')
    try {
      const url = `/api/teacher/classroom/${encodeURIComponent(classroomId)}/students/${encodeURIComponent(
        studentId
      )}/history?cursor=${encodeURIComponent(cursor)}`
      const res = await fetch(url, { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as Partial<StudentHistoryPageData> & { error?: string }
      if (!res.ok) {
        setLoadError(
          res.status === 404
            ? `${firstName} is no longer in this class — reload the page.`
            : data.error || 'Could not load more of their work. Try again.'
        )
        return
      }
      const more = Array.isArray(data.attempts) ? data.attempts : []
      // A row already shown (the page was reloaded between requests) is not shown twice.
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...more.filter((r) => !seen.has(r.id))]
      })
      setCursor(typeof data.next_cursor === 'string' ? data.next_cursor : null)
      setStatus(
        more.length === 0
          ? 'Nothing more in this subject in that stretch.'
          : `Loaded ${more.length} more ${more.length === 1 ? 'script' : 'scripts'}.`
      )
    } catch {
      setLoadError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (error || !initial) {
    return (
      <section className="ms-teacher-error mb-8" role="alert" aria-labelledby={headingId}>
        <h2 id={headingId} className="ms-teacher-error__title">
          {firstName}&apos;s marked work didn&apos;t load
        </h2>
        <p className="ms-teacher-error__body">{error || 'Reload the page to try again.'}</p>
      </section>
    )
  }

  const loadMoreControls = (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {loading ? 'Loading more of their work…' : status}
      </p>
      {loadError ? (
        <div className="ms-teacher-error mt-3" role="alert">
          <p className="ms-teacher-error__body">{loadError}</p>
        </div>
      ) : null}
      {cursor ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            aria-busy={loading || undefined}
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </>
  )

  if (rows.length === 0 && cursor) {
    // The newest stretch of their work (the history reads a bounded window
    // per page) held nothing in this subject, but there is more to look at.
    return (
      <section className="ms-teacher-empty mb-8" aria-labelledby={headingId}>
        <span className="ms-teacher-empty__icon" aria-hidden>
          INK
        </span>
        <h2 id={headingId} className="ms-teacher-empty__title">
          Nothing in this subject among {firstName}&apos;s most recent work
        </h2>
        <p className="ms-teacher-empty__body">
          Their latest scripts are all in other subjects. Load more to look further back.
        </p>
        {loadMoreControls}
      </section>
    )
  }

  if (rows.length === 0 && !cursor) {
    return (
      <section className="ms-teacher-empty mb-8" aria-labelledby={headingId}>
        <span className="ms-teacher-empty__icon" aria-hidden>
          INK
        </span>
        <h2 id={headingId} className="ms-teacher-empty__title">
          No marked work from {firstName} yet
        </h2>
        <p className="ms-teacher-empty__body">
          Scripts they mark in this class&apos;s subject since joining appear here, newest first, with your decisions
          on them.
        </p>
      </section>
    )
  }

  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="ms-teacher-section-title">
          Marked work
        </h2>
        <p className="text-sm text-[var(--ec-text-secondary)]">Newest first · this subject, since joining</p>
      </div>

      <ol className="ec-card ec-card--paper m-0 list-none divide-y divide-[var(--ec-border)] p-0">
        {rows.map((row) => (
          <HistoryRow
            key={row.id}
            row={row}
            classroomId={classroomId}
            studentId={studentId}
            selected={canNote && row.id === selectedAttemptId}
            canNote={canNote}
            nowMs={nowMs}
          />
        ))}
      </ol>

      {loadMoreControls}
      {!cursor ? (
        <p className="mt-3 text-xs text-[var(--ec-text-secondary)]">That&apos;s everything in this subject since they joined.</p>
      ) : null}
    </section>
  )
}

function HistoryRow({
  row,
  classroomId,
  studentId,
  selected,
  canNote,
  nowMs,
}: {
  row: StudentHistoryRow
  classroomId: string
  studentId: string
  selected: boolean
  canNote: boolean
  nowMs: number
}) {
  const badge = row.decision ? DECISION_BADGE[row.decision] : null
  const marks = marksLine(row.marks_earned, row.total_marks, row.pct)
  const when = relativeDay(row.created_at, nowMs)
  const noteHref = `${studentHref(classroomId, studentId)}?attempt=${encodeURIComponent(row.id)}#feedback`

  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between" aria-current={selected || undefined}>
      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">{row.work}</span>
          {badge ? (
            <span className="ms-teacher-chip" title={badge.label}>
              <span aria-hidden>{badge.stamp}</span>
              <span className="sr-only">{badge.label}</span>
            </span>
          ) : null}
          {row.set ? (
            // The link is the 44px target; the chip inside it truncates a
            // long set title (up to 120 characters) instead of pushing past
            // the card at 360px. The full title is in `title`.
            <Link
              href={setHref(classroomId, row.set.id)}
              className="inline-flex min-h-[44px] min-w-0 max-w-full items-center hover:underline"
              title={row.set.title}
            >
              <span className="ms-teacher-chip min-w-0 max-w-full">
                <span className="sr-only">Handed in to the set </span>
                <span className="min-w-0 truncate">{row.set.title}</span>
              </span>
            </Link>
          ) : null}
        </p>
        {row.preview ? (
          // A div: MathText may render display maths as a block.
          <div className="mt-1 text-sm text-[var(--ec-text-secondary)]">
            <MathText text={row.preview} />
          </div>
        ) : null}
        <p className="m-0 mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--ec-text-secondary)]">
          {when ? <time dateTime={row.created_at}>{when}</time> : null}
          <span className="font-mono font-semibold tabular-nums text-[var(--ec-text-primary)]">
            {marks ?? 'not marked yet'}
          </span>
          {row.judgement ? <span>marked against bands</span> : null}
          {row.topics.length > 0 ? (
            <span>
              <span className="sr-only">Syllabus topics </span>
              <span className="font-mono">{row.topics.join(' · ')}</span>
            </span>
          ) : null}
          {selected ? <span className="font-semibold text-[var(--ec-text-primary)]">Selected for a note</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={reviewHref(row.id)}
          className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center px-3 text-sm"
          aria-label={`Open ${row.work}${when ? ` from ${when}` : ''} in the review console`}
        >
          Review
        </Link>
        {canNote && !selected ? (
          <Link
            href={noteHref}
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center px-3 text-sm"
            aria-label={`Write a note on ${row.work}${when ? ` from ${when}` : ''}`}
          >
            Note
          </Link>
        ) : null}
      </div>
    </li>
  )
}
