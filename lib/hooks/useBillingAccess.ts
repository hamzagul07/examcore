'use client'

import { useEffect, useState } from 'react'
import type { EffectiveAccess } from '@/lib/billing/access'
import type { BillingSummaryClient } from '@/lib/billing/question-copy'

type AccessState = {
  /** undefined while loading; resolves to 'free' for signed-out / on error. */
  access: EffectiveAccess | undefined
  trialEndsAt: string | null
  summary: BillingSummaryClient | null
}

/**
 * Reads the user's effective access level from /api/billing/summary and keeps it
 * fresh via the shared `ec:billing-refresh` event. Signed-out users resolve to
 * 'free'. Used to gate lesson content and show trial countdowns.
 */
export function useBillingAccess(): AccessState {
  const [state, setState] = useState<AccessState>({
    access: undefined,
    trialEndsAt: null,
    summary: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/billing/summary', { cache: 'no-store' })
        const data = (await res.json()) as Partial<BillingSummaryClient>
        if (cancelled) return
        setState({
          access: (data.access ?? 'free') as EffectiveAccess,
          trialEndsAt: data.trial_ends_at ?? null,
          summary: data.signedIn ? (data as BillingSummaryClient) : null,
        })
      } catch {
        if (!cancelled) setState({ access: 'free', trialEndsAt: null, summary: null })
      }
    }
    void load()
    const onRefresh = () => void load()
    window.addEventListener('ec:billing-refresh', onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('ec:billing-refresh', onRefresh)
    }
  }, [])

  return state
}
