'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

const SHOW_AFTER_PX = 1200

/** Frosted floating pill that appears on long pages and scrolls back to top. */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER_PX)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`ec-back-to-top${visible ? ' is-visible' : ''}`}
      onClick={() => {
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      }}
    >
      <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  )
}
