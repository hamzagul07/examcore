'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * First-party page-visit tracker. Measures (approximate, visibility-aware) active
 * time on each route and beacons it to /api/track on route change and tab hide.
 * The endpoint only stores events for signed-in users. Web timing is inherently
 * approximate (backgrounded/closed tabs, lost beacons) — treat it as an estimate.
 */
const MIN_DWELL_MS = 1000 // ignore sub-second glances

function beacon(path: string, dwellMs: number, referrer: string) {
  if (dwellMs < MIN_DWELL_MS) return
  const body = JSON.stringify({ path, dwellMs, referrer })
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    // fall through to fetch
  }
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export function VisitTracker() {
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  const referrerRef = useRef('')
  // Accumulated active ms for the current path; `visibleSince` is the start of the
  // current visible segment (null while the tab is hidden/paused).
  const activeRef = useRef(0)
  const visibleSinceRef = useRef<number | null>(Date.now())

  // Fold the currently-visible segment into the accumulator and pause the clock.
  const accumulate = () => {
    if (visibleSinceRef.current != null) {
      activeRef.current += Date.now() - visibleSinceRef.current
      visibleSinceRef.current = null
    }
  }

  const flush = (path: string) => {
    accumulate()
    beacon(path, activeRef.current, referrerRef.current)
    activeRef.current = 0
    visibleSinceRef.current = Date.now()
  }

  // Route change: flush the previous path, then start the new one.
  useEffect(() => {
    if (pathRef.current !== pathname) {
      flush(pathRef.current)
      referrerRef.current = pathRef.current
      pathRef.current = pathname
      activeRef.current = 0
      visibleSinceRef.current = Date.now()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Pause on hide, resume on show, flush on unload.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') accumulate()
      else visibleSinceRef.current = Date.now()
    }
    const onPageHide = () => flush(pathRef.current)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
