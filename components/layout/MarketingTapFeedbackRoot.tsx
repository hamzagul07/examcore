'use client'

import { useRef, type ReactNode } from 'react'
import { useTapFeedback } from '@/lib/hooks/useTapFeedback'
import type { TapFeedbackConfig } from '@/lib/hooks/useTapFeedback'

const MARKETING_TAP_SELECTOR = [
  'button:not(:disabled):not([aria-busy="true"])',
  '[role="button"]:not([aria-disabled="true"]):not([aria-busy="true"])',
  'a.ec-wordmark-link',
  'a.ec-nav-link',
  'a.ec-nav-context',
  'button.ec-cmdk-btn',
  '.ec-theme-flip',
  'button.notif-bell',
  'a.ec-btn-primary',
  'a.ec-btn-secondary',
  'a.ec-btn-ghost',
  'a.ec-btn-warm',
  'a.ec-btn-underline',
  '.ec-btn-primary',
  '.ec-btn-warm',
  '.ms-scard2',
  '.ms-pillar',
  '.faq-q',
].join(', ')

export const MARKETING_TAP_CONFIG: TapFeedbackConfig = {
  selector: MARKETING_TAP_SELECTOR,
  tappedClass: 'ec-tapped',
  hapticSelector:
    'a.ec-wordmark-link, a.ec-nav-link, a.ec-nav-context, a.ec-btn-primary, a.ec-btn-warm, .ec-btn-primary',
}

export function MarketingTapFeedbackRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useTapFeedback(ref, MARKETING_TAP_CONFIG)
  return (
    <div ref={ref} className="ec-marketing-root min-h-full">
      {children}
    </div>
  )
}
