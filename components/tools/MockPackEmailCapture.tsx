'use client'

import { useState } from 'react'
import { HONEYPOT_FIELD } from '@/lib/honeypot'

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
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not save your email')
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not save your email')
    }
  }

  if (status === 'done') {
    return (
      <div className={`ec-card p-5 ${className}`.trim()}>
        <p className="ms-h3" style={{ fontSize: '1.05rem' }}>
          You&apos;re on the list
        </p>
        <p className="ms-body-2" style={{ marginTop: 8 }}>
          We&apos;ll send the November mock pack — one past-paper focus path per week, no spam.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`ec-card p-5 ${className}`.trim()}>
      <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
        Free mock pack
      </p>
      <p className="ms-h3" style={{ fontSize: '1.1rem', marginTop: 6 }}>
        Get the November mock pack
      </p>
      <p className="ms-body-2" style={{ marginTop: 8 }}>
        Honest promise: we&apos;ll email you a mock-season plan when marking actually matters —
        not a sales drip during summer holidays.
      </p>
      <label className="sr-only" htmlFor="mock-pack-email">
        Email
      </label>
      <input
        id="mock-pack-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@school.edu"
        className="mt-4 w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-bg)] px-3 py-2.5 text-sm"
      />
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
