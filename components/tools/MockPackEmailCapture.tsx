'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HONEYPOT_FIELD } from '@/lib/honeypot'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

type Props = {
  source?: string
  syllabusCode?: string | null
  rawMark?: number | null
  predictedGrade?: string | null
  className?: string
}

/**
 * November mock pack capture. Max subscribers already have the focus paths in
 * the Resource Vault — show unlock CTA instead of a waitlist.
 */
export function MockPackEmailCapture({
  source = 'results-2026',
  syllabusCode = null,
  rawMark = null,
  predictedGrade = null,
  className = '',
}: Props) {
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [isMaxUser, setIsMaxUser] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/billing/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { access?: string } | null) => {
        if (cancelled) return
        setIsMaxUser(data?.access === 'max')
        setAccessChecked(true)
      })
      .catch(() => {
        if (!cancelled) setAccessChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/leads/mock-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          syllabusCode: syllabusCode ?? undefined,
          rawMark: rawMark ?? undefined,
          predictedGrade: predictedGrade ?? undefined,
          [HONEYPOT_FIELD]: honeypot,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        isNew?: boolean
      }
      if (!res.ok) throw new Error(data.error || 'Could not save your email')
      trackFunnelEvent('lead_captured', {
        source,
        subject: syllabusCode,
      })
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not save your email')
    }
  }

  if (accessChecked && isMaxUser) {
    const vaultHref = syllabusCode
      ? `/dashboard/vault?subject=${encodeURIComponent(syllabusCode)}`
      : '/dashboard/vault'
    return (
      <div className={`gb-official ${className}`.trim()}>
        <span className="gb-result-stamp" aria-hidden style={{ margin: '0 0 10px', display: 'inline-grid' }}>
          MX
        </span>
        <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
          Max included
        </p>
        <p className="ms-h3" style={{ fontSize: '1.1rem', margin: 0 }}>
          Your mock focus paths are in the Vault
        </p>
        <p className="ms-body-2" style={{ marginTop: 8 }}>
          Max unlocks personalised past-paper focus paths now — no waitlist. Open the Resource Vault
          for this week&apos;s sprint.
        </p>
        <Link
          href={vaultHref}
          className="ec-btn-primary inline-flex justify-center"
          style={{ marginTop: 14 }}
        >
          Open Max Vault →
        </Link>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className={`gb-official ${className}`.trim()}>
        <span className="gb-result-stamp" aria-hidden style={{ margin: '0 0 10px', display: 'inline-grid' }}>
          M1
        </span>
        <p className="ms-h3" style={{ fontSize: '1.05rem', margin: 0 }}>
          You&apos;re on the list
        </p>
        <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0 }}>
          Check your inbox for a confirmation with Results Day links. November mock pack
          follows when marking season starts — or upgrade to Max for focus paths in the Vault
          now.
        </p>
        <p className="ms-body-2" style={{ marginTop: 10, marginBottom: 0 }}>
          <Link href="/pricing" className="ec-link font-semibold">
            See Max →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`gb-official ${className}`.trim()}>
      <span className="gb-result-stamp" aria-hidden style={{ margin: '0 0 10px', display: 'inline-grid' }}>
        NOV
      </span>
      <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
        Free mock pack waitlist
      </p>
      <p className="ms-h3" style={{ fontSize: '1.1rem', margin: 0 }}>
        Get the November mock pack
      </p>
      <p className="ms-body-2" style={{ marginTop: 8 }}>
        Honest promise: we&apos;ll email you a mock-season plan when marking actually matters —
        not a sales drip during summer holidays. Max members get focus paths in the Vault
        immediately.
      </p>
      <label className="gb-field" htmlFor="mock-pack-email" style={{ marginTop: 14, marginBottom: 0 }}>
        <span>Email</span>
        <input
          id="mock-pack-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.edu"
        />
      </label>
      <input
        type="text"
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
      />
      {error ? (
        <p className="ms-body-2" style={{ color: 'var(--ec-danger, #b4413b)', marginTop: 8 }}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="ec-btn-primary"
        style={{ marginTop: 14, width: '100%' }}
        disabled={status === 'saving'}
      >
        {status === 'saving' ? 'Saving…' : 'Send me the mock pack'}
      </button>
      <p className="ms-body-2" style={{ marginTop: 10, marginBottom: 0 }}>
        Already grinding papers?{' '}
        <Link href="/pricing" className="ec-link font-semibold">
          Unlock Max Vault now →
        </Link>
      </p>
    </form>
  )
}
