'use client'

import { useEffect } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

/** Fires once per mount on acquisition landings (home, results hub, etc.). */
export function FunnelLandingView({
  source,
  subject,
}: {
  source?: string
  subject?: string
}) {
  useEffect(() => {
    trackFunnelEvent('landing_view', { source: source ?? 'landing', subject })
  }, [source, subject])
  return null
}
