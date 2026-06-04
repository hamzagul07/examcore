'use client'

import { useEffect, useState } from 'react'

/** Thin brand bar at top of viewport while reading an article. */
export function BlogReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement
      const scrollTop = el.scrollTop
      const height = el.scrollHeight - el.clientHeight
      setProgress(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="ec-blog-reading-progress pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left"
      style={{
        transform: `scaleX(${progress / 100})`,
        background: 'var(--ec-brand-gradient)',
      }}
      aria-hidden
    />
  )
}
