'use client'

import { useSyncExternalStore } from 'react'
import {
  FALLBACK_TIME_ZONE,
  formatDate,
  formatDueLong,
  formatDueShort,
  safeTimeZone,
} from '@/components/teacher/assignments/format'

const noSubscribe = () => () => {}

function browserTimeZone(): string {
  try {
    return safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

/**
 * A deadline in the reader's own time zone.
 *
 * The server renders it in `timeZone` (its best guess — see requestTimeZone);
 * after hydration useSyncExternalStore swaps in the browser's zone, without a
 * hydration mismatch. `now` fixes "Today / Tomorrow" to the instant the page
 * was computed, so server and client agree on the first render.
 */
export function LocalTime({
  iso,
  variant = 'short',
  timeZone,
  now,
  className,
}: {
  iso: string
  variant?: 'short' | 'long' | 'date'
  /** The server's guess; the browser's own zone replaces it after hydration. */
  timeZone?: string
  /** ISO instant "today" is relative to (short variant); without it the date is absolute. */
  now?: string
  className?: string
}) {
  const tz = useSyncExternalStore(noSubscribe, browserTimeZone, () => safeTimeZone(timeZone) ?? FALLBACK_TIME_ZONE)
  const nowMs = now ? Date.parse(now) : Number.NaN
  const text =
    variant === 'long'
      ? formatDueLong(iso, tz)
      : variant === 'date'
        ? formatDate(iso, tz)
        : formatDueShort(iso, { timeZone: tz, now: nowMs })
  if (!text) return null
  return (
    <time dateTime={iso} title={variant === 'long' ? undefined : (formatDueLong(iso, tz) ?? undefined)} className={className}>
      {text}
    </time>
  )
}
