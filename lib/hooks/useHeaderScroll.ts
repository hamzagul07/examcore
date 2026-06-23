'use client'

import { useEffect, useRef, useState } from 'react'

const TOP_REVEAL_PX = 80
const SCROLL_DELTA_PX = 8
const SCROLLED_PX = 20

export type HeaderScrollState = {
  /** User has scrolled away from the very top. */
  scrolled: boolean
  /** Header should slide off-screen (scroll down). */
  hidden: boolean
}

/**
 * Hide the sticky header on scroll down; reveal on scroll up or near top.
 */
export function useHeaderScroll(lockVisible: boolean): HeaderScrollState {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    lastY.current = window.scrollY

    const update = () => {
      const y = window.scrollY
      setScrolled(y > SCROLLED_PX)

      if (lockVisible || reduceMotion || y <= TOP_REVEAL_PX) {
        setHidden(false)
      } else if (y > lastY.current + SCROLL_DELTA_PX) {
        setHidden(true)
      } else if (y < lastY.current - SCROLL_DELTA_PX) {
        setHidden(false)
      }

      lastY.current = y
      ticking.current = false
    }

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lockVisible])

  return { scrolled, hidden }
}
