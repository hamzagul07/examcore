'use client'

import { useEffect, useState, type CSSProperties } from 'react'

function studyScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.lesson-page[data-study="on"]')
}

/**
 * Thin reading bar. Tracks the window normally; when study immersion pins the
 * lesson as its own scrollport, track that element instead.
 */
export function ReadingProgress({ accent }: { accent?: string }) {
  const [p, setP] = useState(0)

  useEffect(() => {
    const measure = () => {
      const root = studyScrollRoot()
      if (root) {
        const max = root.scrollHeight - root.clientHeight
        setP(max > 0 ? Math.min(100, (root.scrollTop / max) * 100) : 0)
        return
      }
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const y = window.scrollY || h.scrollTop
      setP(max > 0 ? Math.min(100, (y / max) * 100) : 0)
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)

    let root: HTMLElement | null = studyScrollRoot()
    const onRootScroll = () => measure()
    if (root) root.addEventListener('scroll', onRootScroll, { passive: true })

    // Study mode toggles the scrollport without remounting this bar.
    const obs = new MutationObserver(() => {
      if (root) root.removeEventListener('scroll', onRootScroll)
      root = studyScrollRoot()
      if (root) root.addEventListener('scroll', onRootScroll, { passive: true })
      measure()
    })
    const page = document.querySelector('.lesson-page')
    if (page) obs.observe(page, { attributes: true, attributeFilter: ['data-study'] })

    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      if (root) root.removeEventListener('scroll', onRootScroll)
      obs.disconnect()
    }
  }, [])

  const style = {
    '--reading-pct': `${p}%`,
    ...(accent
      ? {
          '--reading-accent': accent,
        }
      : undefined),
  } as CSSProperties

  return (
    <div className="reading-progress" aria-hidden style={style}>
      <span />
    </div>
  )
}
