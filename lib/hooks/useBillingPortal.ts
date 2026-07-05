'use client'

import { useCallback, useRef, useState } from 'react'

export type BillingPortalState = 'idle' | 'loading' | 'opened' | 'error'

type Options = {
  returnUrl?: string
}

type Result = {
  state: BillingPortalState
  errorMessage: string
  openPortal: () => Promise<void>
  reset: () => void
}

/** Opens the Polar customer portal via /api/billing/portal. */
export function useBillingPortal({ returnUrl = '/account/billing' }: Options = {}): Result {
  const [state, setState] = useState<BillingPortalState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setState('idle')
    setErrorMessage('')
  }, [clearTimers])

  const openPortal = useCallback(async () => {
    clearTimers()
    setState('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: returnUrl }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.url) {
        setState('error')
        setErrorMessage(data?.error || 'Could not open the billing portal.')
        return
      }

      // Navigate in the same tab. window.open('_blank') after an await is
      // outside the click's user-gesture context, so browsers block it as a
      // pop-up. A full-page redirect always works; the Polar portal has its own
      // "back" navigation to return here.
      setState('opened')
      window.location.assign(data.url as string)
    } catch {
      setState('error')
      setErrorMessage('Could not open the billing portal.')
    }
  }, [clearTimers, returnUrl])

  return { state, errorMessage, openPortal, reset }
}

export function billingPortalButtonLabel(state: BillingPortalState, idleLabel: string): string {
  switch (state) {
    case 'loading':
      return 'Opening your billing portal…'
    case 'opened':
      return 'Redirecting…'
    default:
      return idleLabel
  }
}
