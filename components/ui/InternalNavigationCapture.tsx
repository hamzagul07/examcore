'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { navigationLoading } from '@/lib/navigation/loading-store'

function normalizePath(path: string): string {
  const base = path.split('?')[0]?.split('#')[0] ?? path
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

/** Starts the global progress UI for plain `<Link>` / `<a>` navigations. */
export function InternalNavigationCapture() {
  const pathname = usePathname()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as Element | null)?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (anchor.dataset.loading === 'true') return

      const raw = anchor.getAttribute('href') ?? ''
      if (!raw.startsWith('/') || raw.startsWith('//')) return
      if (raw.startsWith('/#') || raw === '#') return

      const next = normalizePath(raw)
      const current = normalizePath(pathname)
      if (next === current) return

      navigationLoading.start()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  return null
}
