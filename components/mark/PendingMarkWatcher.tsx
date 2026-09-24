'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PaperToast } from '@/components/ui/PaperToast'

import {
  clearFinishedMark,
  clearPendingMark,
  readFinishedMark,
  readPendingMark,
  PENDING_MARK_EVENT,
  type PendingMark,
} from '@/lib/marking/pending-mark'

/**
 * Watches for a mark the student left running and tells them when it lands.
 *
 * This is the piece that makes leaving actually worth doing. The wait screen
 * says "you can close this tab", and email covers the student who closes the
 * browser — but the more common case is someone who stays in the app and goes
 * to read a lesson. Without this they would have to navigate back to /mark and
 * hope, which is just the progress bar again with extra steps.
 *
 * Mounted once, app-wide. Polls only while the tab is visible: a backgrounded
 * tab cannot show anyone a banner, and the run is being watched by the server
 * regardless.
 */

/** Slow on purpose. Marking takes minutes; this is a background check, not a
 * progress bar, and every poll is a function invocation. */
const POLL_MS = 15_000

type Settled = {
  attemptId: string | null
  marksEarned: number | null
  totalMarks: number | null
  ok: boolean
}

export function PendingMarkWatcher() {
  const [pending, setPending] = useState<PendingMark | null>(null)
  const [settled, setSettled] = useState<Settled | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const pathname = usePathname()
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pick up a run started in this tab, or one already in storage from another.
  //
  // A finished record wins outright: the stream handler already knows the
  // outcome, so there is nothing to poll for and the banner can appear at once.
  useEffect(() => {
    const sync = () => {
      const done = readFinishedMark()
      if (done) {
        clearFinishedMark()
        setSettled({
          attemptId: done.attemptId,
          marksEarned: done.marksEarned,
          totalMarks: done.totalMarks,
          ok: done.ok && !!done.attemptId,
        })
        setDismissed(false)
        setPending(null)
        return
      }
      setPending(readPendingMark())
    }
    sync()
    window.addEventListener(PENDING_MARK_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PENDING_MARK_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const check = useCallback(async (runId: string) => {
    try {
      const res = await fetch(
        `/api/mark/run-status?mark_run_id=${encodeURIComponent(runId)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        // A 403/404 means this run is not ours to watch (signed out, or the row
        // is gone). Stop rather than poll a dead id for twenty minutes.
        if (res.status === 403 || res.status === 404) {
          clearPendingMark()
          setPending(null)
        }
        return
      }
      const data = (await res.json()) as {
        settled?: boolean
        status?: string
        attempt_id?: string | null
        marks_earned?: number | null
        total_marks?: number | null
      }
      if (!data.settled) return

      clearPendingMark()
      setPending(null)
      setSettled({
        attemptId: data.attempt_id ?? null,
        marksEarned: data.marks_earned ?? null,
        totalMarks: data.total_marks ?? null,
        ok: data.status === 'success' && !!data.attempt_id,
      })
    } catch {
      /* offline or transient — the next tick tries again */
    }
  }, [])

  useEffect(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    if (!pending) return

    // Polling is suppressed on /mark, where a live stream is already reporting
    // progress — but only polling. A finished record still announces there,
    // because coming back to /mark and finding a blank form with no word on the
    // mark you started is precisely the gap this exists to close.
    if (pathname?.startsWith('/mark')) return

    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void check(pending.markRunId)
    }
    tick()
    timer.current = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      if (timer.current) clearInterval(timer.current)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [pending, pathname, check])

  if (!settled) return null

  const href = settled.attemptId ? `/dashboard/attempt/${settled.attemptId}` : '/mark'
  const scored =
    settled.ok && settled.marksEarned != null && settled.totalMarks
      ? `${settled.marksEarned}/${settled.totalMarks}`
      : null

  return (
    <PaperToast
      open={!dismissed}
      onDismiss={() => setDismissed(true)}
      stamp={settled.ok ? 'OK' : 'A0'}
      tone={settled.ok ? 'ink' : 'crimson'}
      title={
        settled.ok
          ? scored
            ? `Your mark is ready — ${scored}`
            : 'Your mark is ready'
          : 'That mark did not finish'
      }
      body={
        settled.ok
          ? 'Finished while you were elsewhere.'
          : 'Nothing was charged for it — worth trying again.'
      }
      action={{ href, label: settled.ok ? 'See every mark' : 'Try again' }}
      dismissLabel="Later"
    />
  )
}
