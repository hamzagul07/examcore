'use client'

import { useEffect, useState } from 'react'

import {
  readPendingMark,
  PENDING_MARK_EVENT,
} from '@/lib/marking/pending-mark'

/**
 * "A mark is already running" — shown on /mark when one is in flight elsewhere.
 *
 * Leaving the page does not stop the mark, but it does leave the page. Come
 * back and you get a blank upload form with no sign that anything is happening,
 * which reads as though the work was thrown away — the exact opposite of what
 * the wait screen promised, and the reason to distrust it next time.
 *
 * Only rendered when this page is not itself running a mark; the live wait
 * chrome says everything this would, with a progress bar attached.
 */
export type RunningElsewhereNoticeProps = {
  /** True when this page has its own mark in flight — then say nothing. */
  liveHere: boolean
}

function minutesSince(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 60_000))
}

export function RunningElsewhereNotice({ liveHere }: RunningElsewhereNoticeProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const sync = () => setStartedAt(readPendingMark()?.startedAt ?? null)
    sync()
    window.addEventListener(PENDING_MARK_EVENT, sync)
    window.addEventListener('storage', sync)
    // Re-reads rather than counting locally, so the notice disappears on its
    // own once the run lands or the entry expires.
    const t = setInterval(() => {
      sync()
      forceTick((n) => n + 1)
    }, 20_000)
    return () => {
      window.removeEventListener(PENDING_MARK_EVENT, sync)
      window.removeEventListener('storage', sync)
      clearInterval(t)
    }
  }, [])

  if (liveHere || startedAt == null) return null

  const mins = minutesSince(startedAt)

  return (
    <section
      role="status"
      aria-live="polite"
      className="mb-5 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface)] p-4"
    >
      <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
        A mark is still running
        {mins > 0 ? ` — started ${mins} minute${mins === 1 ? '' : 's'} ago` : ''}
      </p>
      <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
        It kept going after you left this page. You&apos;ll get a message here the
        moment it lands, and an email if you&apos;ve closed the tab by then. You can
        start another mark in the meantime.
      </p>
    </section>
  )
}
