'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { AssignmentSummary } from '@/lib/teacher/types'
import { Button } from '@/components/ui/Button'
import { AssignmentSlip } from '@/components/teacher/assignments/AssignmentSlip'

/**
 * "Load more" for the Sets list: the server renders the first page; later
 * pages come from `GET T/assignments?status&cursor` (keyset cursor, so a set
 * published or closed between pages neither repeats nor pushes another off)
 * and are appended here. Focus moves to the first new slip, and the count is
 * announced, so keyboard and screen-reader users land where the list grew.
 *
 * Give it `key={`${status}:${cursor}`}` so a new tab or a refreshed first
 * page starts the appended list again.
 */
export function SetListMore({
  classroomId,
  status,
  cursor: initialCursor,
  timeZone,
}: {
  classroomId: string
  status: 'open' | 'closed' | 'draft'
  cursor: string | null
  timeZone?: string
}) {
  const [items, setItems] = useState<AssignmentSummary[]>([])
  const [cursor, setCursor] = useState(initialCursor)
  const [now, setNow] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [announce, setAnnounce] = useState('')
  const listRef = useRef<HTMLUListElement | null>(null)

  async function loadMore() {
    if (!cursor || loading) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ status, cursor })
      const res = await fetch(`/api/teacher/classroom/${encodeURIComponent(classroomId)}/assignments?${params}`, {
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as {
        assignments?: AssignmentSummary[]
        next_cursor?: string | null
        error?: string
      }
      if (!res.ok || !Array.isArray(data.assignments)) {
        setError(data.error || 'Could not load more sets. Try again.')
        return
      }
      const page = data.assignments
      const firstNewIndex = items.length
      // Render the new slips now, so focus can move to the first of them.
      flushSync(() => {
        setNow(new Date().toISOString())
        setItems((prev) => [...prev, ...page])
        setCursor(data.next_cursor ?? null)
      })
      if (page.length > 0) {
        listRef.current?.children[firstNewIndex]?.querySelector('a')?.focus()
      }
      setAnnounce(
        page.length === 0
          ? 'No more sets.'
          : `${page.length} more ${page.length === 1 ? 'set' : 'sets'} loaded${data.next_cursor ? '' : ' — that is all of them'}.`
      )
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {items.length > 0 ? (
        <ul ref={listRef} className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {items.map((s) => (
            <li key={s.id}>
              <AssignmentSlip classroomId={classroomId} summary={s} timeZone={timeZone} now={now} />
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <div className="ms-teacher-error mt-4" role="alert">
          <p className="ms-teacher-error__title">{error}</p>
        </div>
      ) : null}
      {cursor ? (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loading} loadingText="Loading…">
            Load more sets
          </Button>
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </>
  )
}
