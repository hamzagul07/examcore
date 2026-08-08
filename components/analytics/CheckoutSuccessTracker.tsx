'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

const FIRED_KEY = 'ms_funnel_subscription_started'

/** Fires subscription_started when Stripe returns with ?checkout=success. */
export function CheckoutSuccessTracker() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return
    try {
      if (sessionStorage.getItem(FIRED_KEY) === '1') return
      sessionStorage.setItem(FIRED_KEY, '1')
    } catch {
      /* still fire */
    }
    trackFunnelEvent('subscription_started', {
      path: pathname,
      source: 'stripe_checkout',
    })
  }, [searchParams, pathname])

  return null
}
