'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * True when the ref element intersects the viewport (10% visible).
 * Used to pause decorative animations off-screen.
 */
export function useIntersectionVisible(
  ref: RefObject<Element | null>,
  enabled = true
): boolean {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return
    }
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1, rootMargin: '50px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, enabled])

  return visible
}
