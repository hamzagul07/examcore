'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { MarkSnippet } from '@/components/mark/MarkSnippet'
import { SkeletonBlock } from '@/components/ui/PageSkeleton'
import { DECISION_LABEL, DECISION_STAMP } from '@/lib/teacher/override-validate'
import type { ReviewInboxItem } from '@/lib/teacher/reviews-query'

/** Mirrors HIGH_REVIEW_PRIORITY in lib/teacher/reviews-query.ts (a server module). */
const HIGH_PRIORITY = 40
/** Chips shown on a slip; the rest are summarised as "+n". */
const MAX_CHIPS = 3

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function shortDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? DATE_FORMAT.format(t) : ''
}

function detailHref(attemptId: string, query: string): string {
  return `/teacher/reviews/${attemptId}${query ? `?${query}` : ''}`
}

type ApiPage = { items?: ReviewInboxItem[]; next_cursor?: string | null; error?: string }

/** One script in the queue: `.ms-review-slip` with the priority reasons as warning chips. */
function ReviewSlip({
  item,
  href,
  showClass,
  linkRef,
}: {
  item: ReviewInboxItem
  href: string
  showClass: boolean
  linkRef?: (el: HTMLAnchorElement | null) => void
}) {
  const extra = item.reasons.length - MAX_CHIPS
  const meta = [item.work_label, showClass ? item.classroom_name : null, shortDate(item.created_at)].filter(Boolean)
  return (
    <li>
      <Link
        ref={linkRef}
        href={href}
        className={`ms-review-slip${item.priority >= HIGH_PRIORITY && !item.decision ? ' ms-review-slip--high' : ''}`}
      >
        <span className="ms-review-slip__main">
          <span className="ms-review-slip__name">
            {item.display_name}
            {item.decision ? (
              <>
                {' '}
                <span className="ec-chip ec-chip-neutral ml-1 align-middle" aria-hidden>
                  {DECISION_STAMP[item.decision]}
                </span>
                <span className="sr-only">, {DECISION_LABEL[item.decision].toLowerCase()}</span>
              </>
            ) : null}
          </span>
          <span className="ms-review-slip__meta">
            {meta.join(' · ')}
            {item.question_preview ? (
              <span className="mt-0.5 block line-clamp-2">
                <MarkSnippet text={item.question_preview} />
              </span>
            ) : null}
          </span>
          {item.reasons.length > 0 ? (
            <span className="ms-review-slip__reasons">
              <span className="sr-only">Why it is here: </span>
              {item.reasons.slice(0, MAX_CHIPS).map((reason) => (
                <span key={reason} className="ec-chip ec-chip-warning">
                  {reason}
                </span>
              ))}
              {extra > 0 ? (
                <span className="ec-chip ec-chip-neutral" title={item.reasons.slice(MAX_CHIPS).join(', ')}>
                  +{extra}
                  <span className="sr-only"> more: {item.reasons.slice(MAX_CHIPS).join(', ')}</span>
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        <span className="ms-review-slip__score">
          <span className="sr-only">Mark </span>
          {item.marks_earned}/{item.total_marks}
        </span>
      </Link>
    </li>
  )
}

type InboxProps = {
  /** First page, rendered by the server. */
  items: ReviewInboxItem[]
  nextCursor: string | null
  /** The filter as a query string (no "?"), carried into detail links and "Load more". */
  query: string
  /** Show each slip's class (off when the list is already one class). */
  showClass?: boolean
}

type WidgetProps = {
  /** Self-loading summary for one class: the top pending scripts and a link to the rest. */
  classroomId: string
  limit?: number
}

/**
 * The review queue.
 *
 * Inbox mode (`items` given): the server renders page one; "Load more" is a
 * real link to the next keyset page, so it works before hydration, and once
 * hydrated it fetches `/api/teacher/reviews` and appends instead — focus
 * moves to the first new script and the count is announced.
 *
 * Widget mode (`classroomId` given): a class page's short list of the
 * highest-priority pending scripts, loaded on mount.
 */
export function ReviewQueueList(props: InboxProps | WidgetProps) {
  if ('items' in props) return <InboxList {...props} />
  return <ClassReviewWidget classroomId={props.classroomId} limit={props.limit} />
}

function InboxList({ items: initial, nextCursor: initialCursor, query, showClass = true }: InboxProps) {
  const [items, setItems] = useState(initial)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [announce, setAnnounce] = useState('')
  const focusIndex = useRef<number | null>(null)
  const links = useRef<Array<HTMLAnchorElement | null>>([])

  // A new server render (other filters, or fresh data after a decision)
  // replaces whatever was appended: the server's page one is the truth.
  useEffect(() => {
    setItems(initial)
    setCursor(initialCursor)
    setError('')
  }, [initial, initialCursor])

  useEffect(() => {
    if (focusIndex.current === null) return
    links.current[focusIndex.current]?.focus()
    focusIndex.current = null
  }, [items])

  const nextHref = cursor ? `/teacher/reviews?${query ? `${query}&` : ''}cursor=${encodeURIComponent(cursor)}` : null

  async function loadMore(event: MouseEvent<HTMLAnchorElement>) {
    if (!cursor || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/teacher/reviews?${query ? `${query}&` : ''}cursor=${encodeURIComponent(cursor)}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as ApiPage
      if (!res.ok) {
        setError(data.error || 'Could not load more scripts.')
        return
      }
      const more = (data.items ?? []).filter((m) => !items.some((i) => i.attempt_id === m.attempt_id))
      focusIndex.current = more.length > 0 ? items.length : null
      setItems((prev) => [...prev, ...more])
      setCursor(data.next_cursor ?? null)
      setAnnounce(
        more.length === 0
          ? 'No more scripts.'
          : `Loaded ${more.length} more ${more.length === 1 ? 'script' : 'scripts'}${data.next_cursor ? '' : ' — that is all of them'}.`
      )
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <ul className="ms-review-queue">
        {items.map((item, i) => (
          <ReviewSlip
            key={item.attempt_id}
            item={item}
            href={detailHref(item.attempt_id, query)}
            showClass={showClass}
            linkRef={(el) => {
              links.current[i] = el
            }}
          />
        ))}
      </ul>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {error ? (
        <div className="ms-teacher-error mt-4" role="alert">
          <p className="ms-teacher-error__title">Couldn&apos;t load more</p>
          <p className="ms-teacher-error__body">{error}</p>
        </div>
      ) : null}

      {nextHref ? (
        <p className="mt-6 flex justify-center">
          <a
            href={nextHref}
            onClick={(e) => void loadMore(e)}
            aria-busy={loading || undefined}
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center px-6"
          >
            {loading ? 'Loading…' : error ? 'Try again' : 'Load more'}
          </a>
        </p>
      ) : null}
    </div>
  )
}

type WidgetState =
  | { status: 'loading' }
  | { status: 'ready'; items: ReviewInboxItem[]; pending: number }
  | { status: 'error'; message: string }

function ClassReviewWidget({ classroomId, limit = 5 }: { classroomId: string; limit?: number }) {
  const [state, setState] = useState<WidgetState>({ status: 'loading' })
  const query = `classroom_id=${encodeURIComponent(classroomId)}&status=pending`

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const res = await fetch(`/api/teacher/reviews?${query}&limit=${Math.max(1, Math.min(limit, 20))}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as ApiPage & { counts?: { pending?: number } }
      if (!res.ok) {
        setState({ status: 'error', message: data.error || 'Could not load the scripts to review.' })
        return
      }
      setState({ status: 'ready', items: data.items ?? [], pending: data.counts?.pending ?? 0 })
    } catch {
      setState({ status: 'error', message: 'Could not reach the server. Check your connection and try again.' })
    }
  }, [query, limit])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="ms-teacher-roster" aria-labelledby={`review-queue-${classroomId}`} aria-busy={state.status === 'loading' || undefined}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="ec-label-tech mb-0">Reviews</span>
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              RV
            </span>
          </div>
          <h2 id={`review-queue-${classroomId}`} className="text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl">
            Scripts to check
            {state.status === 'ready' && state.pending > 0 ? (
              <span className="ml-2 font-mono text-base text-[var(--ec-text-secondary)]">{state.pending}</span>
            ) : null}
          </h2>
        </div>
        <Link
          href={`/teacher/reviews?${query}`}
          className="inline-flex min-h-[44px] items-center font-mono text-[11px] font-bold tracking-wide ec-text-brand"
        >
          All reviews →
        </Link>
      </div>

      {state.status === 'loading' ? (
        <div className="ms-review-queue" aria-hidden>
          <SkeletonBlock className="h-[76px] w-full" />
          <SkeletonBlock className="h-[76px] w-full" />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="ms-teacher-error" role="alert">
          <p className="ms-teacher-error__title">Couldn&apos;t load the scripts</p>
          <p className="ms-teacher-error__body">{state.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="ec-btn-secondary mt-4 inline-flex min-h-[44px] items-center"
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && state.items.length === 0 ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            OK
          </span>
          <p className="ms-teacher-empty__title">Nothing waiting</p>
          <p className="ms-teacher-empty__body">
            Every script from this class in the last few weeks has your decision — or none has come in yet.
          </p>
        </div>
      ) : null}

      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className="ms-review-queue">
          {state.items.map((item) => (
            <ReviewSlip key={item.attempt_id} item={item} href={detailHref(item.attempt_id, query)} showClass={false} />
          ))}
        </ul>
      ) : null}
    </section>
  )
}
