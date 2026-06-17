'use client'

import type { ReactNode } from 'react'
import { AuthCheckProvider } from '@/lib/hooks/useAuthCheck'
import { AppTapFeedbackRoot } from '@/components/layout/AppTapFeedbackRoot'

/** Wraps app chrome in one shared auth check (header, tab bar, guest CTAs). */
export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <AuthCheckProvider>
      <AppTapFeedbackRoot>{children}</AppTapFeedbackRoot>
    </AuthCheckProvider>
  )
}
