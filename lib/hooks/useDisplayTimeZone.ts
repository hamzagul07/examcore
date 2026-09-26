import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * The zone to show dates in: 'UTC' while rendering on the server and during
 * hydration, the reader's own zone straight after.
 *
 * A client component that formats a date in the runtime's zone renders one day
 * on the server (UTC) and another in a browser east or west of it — a hydration
 * mismatch, and React throws the server HTML away. Pair this with
 * formatDisplayDate (lib/format/display-date.ts), whose locale is fixed, so the
 * only thing that can change after hydration is a day that really is different
 * where the reader is.
 */
export function useDisplayTimeZone(): string {
  return useSyncExternalStore(noSubscribe, browserTimeZone, () => 'UTC')
}
