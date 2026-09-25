'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  clearAllMarkRecords,
  clearFinishedMark,
  clearPendingMark,
  isMarkRecordOwnedBy,
  markOwnerFor,
  readFinishedMark,
  readPendingMark,
  PENDING_MARK_EVENT,
  type PendingMark,
} from '@/lib/marking/pending-mark'
import { fetchMarkRunStatus } from '@/lib/marking/mark-run-status-client'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

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
 *
 * Owner-checked. localStorage is per browser, and on a shared school machine
 * the next student to sign in was greeted with the previous student's
 * "Your mark is ready — 7/10" and a link to their attempt. Records name the
 * user that wrote them; anything else is ignored, and both keys are cleared
 * the moment the signed-in user changes (including sign-out).
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
  // The auth probe is shared app-wide (one /api/auth/check per page); until it
  // has answered we do not know whose records these are, so nothing is shown.
  const { user, loading: authLoading } = useAuthCheck()
  const owner = authLoading ? null : markOwnerFor(user?.id ?? null)

  // A change of user invalidates every record: they were written by someone
  // else's session. Guest → user and user → guest count too. The first
  // resolved owner is only remembered, not acted on — a reload must not wipe
  // the very record this exists to surface.
  const lastOwnerRef = useRef<string | null>(null)
  useEffect(() => {
    if (owner === null) return
    if (lastOwnerRef.current !== null && lastOwnerRef.current !== owner) {
      clearAllMarkRecords()
      setPending(null)
      setSettled(null)
    }
    lastOwnerRef.current = owner
  }, [owner])

  // Pick up a run started in this tab, or one already in storage from another.
  //
  // A finished record wins outright: the stream handler already knows the
  // outcome, so there is nothing to poll for and the banner can appear at once.
  useEffect(() => {
    if (owner === null) return
    const sync = () => {
      const done = readFinishedMark()
      if (done) {
        if (!isMarkRecordOwnedBy(done, owner)) {
          // Someone else's. Drop it so it cannot resurface for them either —
          // their session will rewrite anything still relevant.
          clearFinishedMark()
        } else {
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
      }
      const next = readPendingMark()
      if (next && !isMarkRecordOwnedBy(next, owner)) {
        clearPendingMark()
        setPending(null)
        return
      }
      setPending(next)
    }
    sync()
    window.addEventListener(PENDING_MARK_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PENDING_MARK_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [owner])

  const check = useCallback(async (runId: string) => {
    const result = await fetchMarkRunStatus(runId)
    if (result.kind === 'gone') {
      clearPendingMark()
      setPending(null)
      return
    }
    if (result.kind !== 'settled') return
    clearPendingMark()
    setPending(null)
    setSettled({
      attemptId: result.outcome.attemptId,
      marksEarned: result.outcome.marksEarned,
      totalMarks: result.outcome.totalMarks,
      ok: result.outcome.ok,
    })
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

  if (!settled || dismissed) return null

  const href = settled.attemptId ? `/dashboard/attempt/${settled.attemptId}` : '/mark'
  const scored =
    settled.ok && settled.marksEarned != null && settled.totalMarks
      ? `${settled.marksEarned}/${settled.totalMarks}`
      : null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4 shadow-lg sm:inset-x-auto sm:right-4"
    >
      <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
        {settled.ok
          ? scored
            ? `Your mark is ready — ${scored}`
            : 'Your mark is ready'
          : 'That mark did not finish'}
      </p>
      <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
        {settled.ok
          ? 'Finished while you were elsewhere.'
          : 'Nothing was charged for it — worth trying again.'}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Link
          href={href}
          onClick={() => setDismissed(true)}
          className="rounded-md bg-[var(--ec-brand)] px-3 py-2 text-sm font-semibold text-[var(--ec-on-brand-text)]"
        >
          {settled.ok ? 'See every mark' : 'Try again'}
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sm text-[var(--ec-text-secondary)] underline underline-offset-2"
        >
          Later
        </button>
      </div>
    </div>
  )
}
