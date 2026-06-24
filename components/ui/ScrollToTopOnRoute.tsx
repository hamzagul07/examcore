'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { scrollPageToTop } from '@/lib/navigation/scroll-page-to-top'

/** Reset scroll position on every client route change. */
export function ScrollToTopOnRoute() {
  const pathname = usePathname()

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    scrollPageToTop()
    const t = window.setTimeout(scrollPageToTop, 0)
    return () => window.clearTimeout(t)
  }, [pathname])

  return null
}
