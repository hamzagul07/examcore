'use client'

import { useEffect, type RefObject } from 'react'

/** Sync measured sticky header height to --ec-nav-height on the nav shell. */
export function useNavHeightVar(navRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const node = navRef.current
    if (!node) return

    const sync = () => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      node.style.setProperty('--ec-nav-height', `${height}px`)
      document.documentElement.style.setProperty('--ec-nav-height', `${height}px`)
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(node)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [navRef])
}
