'use client'

import { usePathname } from 'next/navigation'
import { shouldShowAppHeader } from '@/lib/marketing-paths'
import { AppHeader } from './AppHeader'

/** Renders app header only on non-marketing, non-auth routes. */
export function RootHeader() {
  const pathname = usePathname()
  if (!shouldShowAppHeader(pathname)) return null
  return <AppHeader />
}
