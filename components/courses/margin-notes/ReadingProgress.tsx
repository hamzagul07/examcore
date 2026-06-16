'use client'

import { useEffect, useState, type CSSProperties } from 'react'

export function ReadingProgress({ accent }: { accent?: string }) {
  const [p, setP] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const y = window.scrollY || h.scrollTop
      setP(max > 0 ? Math.min(100, (y / max) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
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
