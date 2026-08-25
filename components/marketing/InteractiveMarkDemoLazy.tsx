'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { DemoSkeleton } from '@/components/marketing/Hero/DemoSkeleton'

// The demo pulls framer-motion (via ExaminerInkOverlay) — ~100 KiB of client JS
// that is dead weight on the homepage's first load. It lives below the fold, so
// we only fetch that chunk once the section nears the viewport. `ssr: false`
// keeps it out of the server HTML and the initial bundle.
const InteractiveMarkDemo = dynamic(
  () =>
    import('@/components/marketing/InteractiveMarkDemo').then(
      (m) => m.InteractiveMarkDemo,
    ),
  { ssr: false, loading: () => <DemoSkeleton /> },
)

export function InteractiveMarkDemoLazy() {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      // Start loading a little before it scrolls into view so the real demo is
      // ready by the time the visitor reaches it.
      { rootMargin: '300px 0px' },
    )
    io.observe(el)

    // Pre-mount during post-hydration idle as well. Measured on a 4x-throttled
    // CPU, this section's chunk-eval + mount is a single ~3s main-thread task —
    // and with the IO alone (the section sits just under the hero) it landed
    // exactly on the visitor's FIRST scroll, which is the freeze B5 chased.
    // Mounting while they are still reading the hero moves the same cost to a
    // moment nobody is interacting. The demo's own in-view gate keeps its ink
    // animation waiting for actual visibility, so nothing plays early. The IO
    // stays as the trigger for people who scroll before idle arrives.
    let idleId: number | undefined
    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(() => setShow(true), { timeout: 6000 })
    }
    return () => {
      io.disconnect()
      if (idleId !== undefined) cancelIdleCallback(idleId)
    }
  }, [])

  return <div ref={ref}>{show ? <InteractiveMarkDemo /> : <DemoSkeleton />}</div>
}
