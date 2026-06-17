'use client'

import { useRef, type ReactNode } from 'react'
import { APP_TAP_CONFIG, useTapFeedback } from '@/lib/hooks/useTapFeedback'

export function AppTapFeedbackRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useTapFeedback(ref, APP_TAP_CONFIG)
  return (
    <div ref={ref} className="ec-app-root flex min-h-full min-w-0 flex-1 flex-col">
      {children}
    </div>
  )
}
