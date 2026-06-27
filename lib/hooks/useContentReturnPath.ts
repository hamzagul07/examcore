'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { buildContentReturnPath } from '@/lib/content-gate'

/** Current page as a post-auth return URL (path + query). */
export function useContentReturnPath(): string {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useMemo(
    () => buildContentReturnPath(pathname, searchParams),
    [pathname, searchParams]
  )
}
