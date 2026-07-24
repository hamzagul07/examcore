'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Section reveal — transform-only (content visible if animation fails).
 *
 * A fade-and-rise on first scroll into view. This used framer-motion, which put
 * ~50 KiB (gzipped) of animation library — plus its hydration cost — on the
 * homepage's critical path for a one-line transition. It's now CSS (`.ms-reveal`
 * in landing-page.css) driven by an IntersectionObserver: same behaviour, no
 * library, and the content stays in the server-rendered HTML.
 */
export function LandingSectionReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '-80px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-reveal={shown ? 'in' : 'out'}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      className={`ms-reveal ${className}`}
    >
      {children}
    </div>
  )
}
