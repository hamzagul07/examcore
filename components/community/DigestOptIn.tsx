'use client'

import { useState } from 'react'

/**
 * One-click opt-in to the weekly subject digest, offered right after someone
 * contributes.
 *
 * ON-02 keeps non-essential mail opt-in and never pre-ticked, so the digest
 * cannot simply be defaulted on — and an unticked box at onboarding is read by
 * nobody. This asks instead at the only moment the answer is obviously yes:
 * they have just posted into a subject and have a reason to want to hear back
 * from it. The click itself is the consent.
 */
export function DigestOptIn({ onDone }: { onDone?: () => void }) {
  const [state, setState] = useState<'idle' | 'saving' | 'on' | 'error'>('idle')

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
        <button type="button" className="rc-btn rc-btn-ghost" onClick={() => onDone?.()}>
          No thanks
        </button>
      </div>
      {state === 'error' ? (
        <p className="rc-error">Could not save that — you can turn it on in your account settings.</p>
      ) : null}
    </div>
  )
}
