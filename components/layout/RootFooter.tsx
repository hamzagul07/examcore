'use client'

import { usePathname } from 'next/navigation'
import { shouldShowAppHeader } from '@/lib/marketing-paths'
import { AppFooter } from './AppFooter'

export function RootFooter() {
  const pathname = usePathname()
  if (!shouldShowAppHeader(pathname)) return null
  return <AppFooter />
}
