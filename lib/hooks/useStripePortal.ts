'use client'

import { useCallback, useRef, useState } from 'react'

export type StripePortalState = 'idle' | 'loading' | 'opened' | 'error'

type Options = {
  returnUrl?: string
}

type Result = {
  state: StripePortalState
  errorMessage: string
  openPortal: () => Promise<void>
  reset: () => void
}

const RESET_MS = 4000

export function useStripePortal({ returnUrl = '/account/billing' }: Options = {}): Result {
  const [state, setState] = useState<StripePortalState>('idle')
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

      const opened = window.open(data.url as string, '_blank', 'noopener,noreferrer')
      if (!opened) {
        setState('error')
        setErrorMessage(
          'Your browser blocked the new tab. Allow pop-ups for MarkScheme, then try again.'
        )
        return
      }

      setState('opened')
      timersRef.current.push(
        setTimeout(() => setState('idle'), RESET_MS)
      )
    } catch {
      setState('error')
      setErrorMessage('Could not open the billing portal.')
    }
  }, [clearTimers, returnUrl])

  return { state, errorMessage, openPortal, reset }
}

export function stripePortalButtonLabel(state: StripePortalState, idleLabel: string): string {
  switch (state) {
    case 'loading':
      return 'Opening your billing portal…'
    case 'opened':
      return 'Opened in new tab'
    default:
      return idleLabel
  }
}
