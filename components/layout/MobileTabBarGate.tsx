'use client'

import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { MobileTabBar } from './MobileTabBar'

/** Renders bottom tab bar only for signed-in, onboarded users on app routes. */
export function MobileTabBarGate() {
  const visible = useAuthenticatedAppChrome()

  if (!visible) return null
  return <MobileTabBar />
}
