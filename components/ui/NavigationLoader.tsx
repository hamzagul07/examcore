'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { navigationLoading } from '@/lib/navigation/loading-store'
import { ExamLoader } from '@/components/ui/ExamLoader'
import { cn } from '@/lib/utils'

const SHOW_PILL_MS = 280
const COMPLETE_MS = 380

export function NavigationLoader() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showPill, setShowPill] = useState(false)
  const [completing, setCompleting] = useState(false)
  const prevPath = useRef(pathname)
  const timers = useRef<number[]>([])

  useEffect(() => navigationLoading.subscribe(setActive), [])

  useEffect(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []

    if (!active) {
      setShowPill(false)
      if (!completing) setProgress(0)
      return
    }

    setCompleting(false)
    setProgress(14)
    timers.current.push(window.setTimeout(() => setProgress(38), 180))
    timers.current.push(window.setTimeout(() => setProgress(58), 420))
    timers.current.push(window.setTimeout(() => setProgress(76), 780))
    timers.current.push(window.setTimeout(() => setProgress(88), 1200))

    timers.current.push(window.setTimeout(() => setShowPill(true), SHOW_PILL_MS))

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      timers.current = []
    }
  }, [active, completing])

  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname
    navigationLoading.reset()
    setCompleting(true)
    setProgress(100)
    setShowPill(false)

    const done = window.setTimeout(() => {
      setCompleting(false)
      setProgress(0)
    }, COMPLETE_MS)
    return () => window.clearTimeout(done)
  }, [pathname])

  const barVisible = active || completing || progress > 0

  return (
    <>
      {barVisible ? (
        <div
          className={cn('ec-nav-progress', completing && 'ec-nav-progress--complete')}
          aria-hidden
        >
          <div className="ec-nav-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {showPill && active ? (
        <div className="ec-nav-progress-pill">
          <ExamLoader size="sm" rotateHints />
        </div>
      ) : null}
    </>
  )
}
