'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { shouldShowMobileTabBar } from '@/lib/marketing-paths'
import { isOnboardingComplete } from '@/lib/onboarding'
import { MobileTabBar } from './MobileTabBar'

/** Renders bottom tab bar only for signed-in, onboarded users on app routes. */
export function MobileTabBarGate() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!shouldShowMobileTabBar(pathname)) {
      setVisible(false)
      return
    }

    let cancelled = false
    const supabase = createClient()

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) {
        if (!cancelled) setVisible(false)
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarded, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      if (!cancelled) {
        setVisible(!!profile && isOnboardingComplete(profile))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathname])

  if (!visible) return null
  return <MobileTabBar />
}
