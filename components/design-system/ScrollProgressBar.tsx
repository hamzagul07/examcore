'use client'

import { useEffect } from 'react'

/** Top-of-page scroll progress — paper design accent gradient. */
export function ScrollProgressBar() {
  useEffect(() => {
    const bar = document.getElementById('ec-scroll-progress')
    if (!bar) return

    function update() {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      const pct = max > 0 ? (el.scrollTop / max) * 100 : 0
      bar!.style.setProperty('--scroll-progress', `${pct}%`)
      bar!.style.width = `${pct}%`
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return <div id="ec-scroll-progress" className="ec-scroll-progress" aria-hidden />
}
