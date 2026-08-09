'use client'

import { useState } from 'react'
import { HONEYPOT_FIELD } from '@/lib/honeypot'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

type Props = {
  source?: string
  syllabusCode?: string | null
  rawMark?: number | null
  predictedGrade?: string | null
  className?: string
}

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
          follows when marking season starts — one past-paper focus path per week, no spam.
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
        Free mock pack
      </p>
      <p className="ms-h3" style={{ fontSize: '1.1rem', margin: 0 }}>
        Get the November mock pack
      </p>
      <p className="ms-body-2" style={{ marginTop: 8 }}>
        Honest promise: we&apos;ll email you a mock-season plan when marking actually matters —
        not a sales drip during summer holidays.
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
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        name={HONEYPOT_FIELD}
      />
      <button
        type="submit"
        disabled={status === 'saving'}
        className="ec-btn-primary mt-3 min-h-[44px] w-full justify-center"
      >
        {status === 'saving' ? 'Saving…' : 'Send me the mock pack'}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-[var(--ec-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
