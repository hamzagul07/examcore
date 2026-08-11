'use client'

import { useEffect, useState } from 'react'

/**
 * One-click opt-in to the weekly subject digest, offered right after someone
 * contributes.
 *
 * ON-02 keeps non-essential mail opt-in and never pre-ticked, so the digest
 * cannot simply be defaulted on — and an unticked box at onboarding is read by
 * nobody. This asks instead at the only moment the answer is obviously yes:
 * they have just posted into a subject and have a reason to want to hear back
 * from it. The click itself is the consent.
 *
 * "No thanks" is remembered locally, so declining once is not re-asked on every
 * later visit. Only the refusal is stored client-side; the subscription itself
 * lives on the profile, where it can actually be honoured.
 */
const DECLINED_KEY = 'ms:community:digest-declined'

export function DigestOptIn({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<'idle' | 'saving' | 'on' | 'error'>('idle')
  const [declinedBefore, setDeclinedBefore] = useState(false)

  // Read after mount, never during render — localStorage is not available on
  // the server and reading it inline would desync the first paint.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(DECLINED_KEY)) setDeclinedBefore(true)
    } catch {
      /* storage unavailable — just ask */
    }
  }, [])

  function decline() {
    try {
      window.localStorage.setItem(DECLINED_KEY, '1')
    } catch {
      /* the session-level guard still stops a repeat ask on this page */
    }
    onDone?.()
  }

  async function turnOn() {
    setState('saving')
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_community_digest: true }),
      })
      if (!res.ok) {
        setState('error')
        return
      }
      setState('on')
      onDone?.()
    } catch {
      setState('error')
    }
  }

  // They already said no on a previous visit. Asking again is how a helpful
  // prompt turns into nagging.
  if (declinedBefore && state === 'idle') return null

  if (state === 'on') {
    return (
      <p className="rc-digest-optin rc-digest-optin--done ms-body-2">
        Done — a weekly roundup for your subjects. Every email has a one-click unsubscribe.
      </p>
    )
  }

  return (
    <div className="rc-digest-optin">
      <p className="ms-body-2" style={{ margin: 0 }}>
        Want the weekly roundup for your subjects? One email a week, one click to stop.
      </p>
      <div className="rc-digest-optin__actions">
        <button type="button" className="rc-btn rc-btn-primary" onClick={turnOn} disabled={state === 'saving'}>
          {state === 'saving' ? 'Turning on…' : 'Email me the roundup'}
        </button>
        <button type="button" className="rc-btn rc-btn-ghost" onClick={decline}>
          No thanks
        </button>
      </div>
      {state === 'error' ? (
        <p className="rc-error">Could not save that — you can turn it on in your account settings.</p>
      ) : null}
    </div>
  )
}
