'use client'

import { useEffect, useRef } from 'react'
import { useTapFeedback } from '@/lib/hooks/useTapFeedback'
import { MARKETING_TAP_CONFIG } from '@/components/layout/MarketingTapFeedbackRoot'

/** Marketing tap feedback without wrapping `{children}` in a client component. */
export function MarketingTapFeedbackLayer() {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    ref.current = document.querySelector('.ec-marketing-root')
  }, [])

  useTapFeedback(ref, MARKETING_TAP_CONFIG)
  return null
}
