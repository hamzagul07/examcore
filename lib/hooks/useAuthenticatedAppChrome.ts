'use client'

import { usePathname } from 'next/navigation'
import { shouldShowMobileTabBar } from '@/lib/marketing-paths'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'

/** True when signed-in, onboarded user is on an authenticated app route. */
export function useAuthenticatedAppChrome(): boolean {
  const pathname = usePathname()
  const { user, onboarded, loading } = useAuthCheck()

  if (!shouldShowMobileTabBar(pathname)) return false
  if (loading) return false
  return !!user && onboarded
}
