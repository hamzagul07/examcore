'use client'

import { useEffect, useRef } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

/** Fires once per Vault mount — not again when ?subject= shelves change. */
export function MaxVaultOpenTracker({
  subjectCode,
  sprint,
}: {
  subjectCode: string | null
  sprint: boolean
}) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackFunnelEvent('vault_opened', {
      subject: subjectCode,
      source: sprint ? 'max_sprint' : 'max_vault',
      path: '/dashboard/vault',
    })
    // Intentionally omit subjectCode/sprint from deps — shelf switches must not
    // recount opens. Initial mount values are enough for the funnel event.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, [])
  return null
}
