'use client'

import { useState } from 'react'
import Link from 'next/link'

export type ApplyState = 'none' | 'pending' | 'approved' | 'declined' | 'seat'

/**
 * Asking for a creator space, in-product. Replaces the mailto: the founder
 * reviews it in /admin/creators and the seat is granted from there.
 */
export function CreatorApplyForm({
  signedIn,
  signInHref,
  state,
}: {
  signedIn: boolean
  signInHref: string
  state: ApplyState
}) {
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tagline, setTagline] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [exams, setExams] = useState('')
  const [audienceSize, setAudienceSize] = useState('1k_10k')
  const [isAdult, setIsAdult] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(state === 'pending')

  if (state === 'seat') {
    return (
      <p className="ms-cr-empty">
        You already have a creator seat.{' '}
        <Link href="/creator" className="ec-btn-underline">
          Open your studio -&gt;
        </Link>
      </p>
    )
  }
  if (!signedIn) {
    return (
      <div className="ms-cr-form">
        <p className="ms-cr-section__lead">
          The space hangs off an account, so sign in (or sign up, it takes a minute) and the form
          appears here.
        </p>
        <Link href={signInHref} className="ec-btn-primary inline-flex min-h-[48px] items-center px-6">
          Sign in to ask for a space
        </Link>
      </div>
    )
  }
  if (done) {
    return (
      <p className="ms-cr-empty" role="status">
        Application received. We look at the channels you listed and reply by email, usually within
        a few days. Nothing else to do.
      </p>
    )
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          displayName,
          tagline,
          tiktok,
          instagram,
          youtube,
          exams,
          audienceSize,
          isAdult,
          message,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not send the application.')
        return
      }
      setDone(true)
    } catch {
      setError('Could not send the application.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ms-cr-form" aria-label="Ask for a creator space">
      {state === 'declined' ? (
        <p className="ms-cr-chip__note">
          A previous application was not approved. You can apply again with more detail.
        </p>
      ) : null}
      <div className="ms-cr-form__grid">
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Handle you want (your space is /with/handle)</span>
          <input
            className="ec-input"
            value={handle}
            maxLength={20}
            placeholder="maya_studies"
            autoCapitalize="none"
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
          />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">What to call you</span>
          <input
            className="ec-input"
            value={displayName}
            maxLength={60}
            placeholder="Maya"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
      </div>
      <label className="ms-cr-form__field">
        <span className="ms-cr-form__label">One line about what you post</span>
        <input
          className="ec-input"
          value={tagline}
          maxLength={160}
          placeholder="IGCSE and A Level tips that actually get marks. Zero fluff."
          onChange={(e) => setTagline(e.target.value)}
        />
      </label>
      <div className="ms-cr-form__grid ms-cr-form__grid--three">
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">TikTok</span>
          <input className="ec-input" value={tiktok} maxLength={120} placeholder="@handle" onChange={(e) => setTiktok(e.target.value)} />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Instagram</span>
          <input className="ec-input" value={instagram} maxLength={120} placeholder="@handle" onChange={(e) => setInstagram(e.target.value)} />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">YouTube</span>
          <input className="ec-input" value={youtube} maxLength={120} placeholder="@handle" onChange={(e) => setYoutube(e.target.value)} />
        </label>
      </div>
      <div className="ms-cr-form__grid">
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Exams your audience sits</span>
          <input
            className="ec-input"
            value={exams}
            maxLength={120}
            placeholder="IGCSE, A Level, IB…"
            onChange={(e) => setExams(e.target.value)}
          />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Audience size</span>
          <select
            className="ec-input select-chevron appearance-none"
            value={audienceSize}
            onChange={(e) => setAudienceSize(e.target.value)}
          >
            <option value="under_1k">Under 1,000</option>
            <option value="1k_10k">1,000 – 10,000</option>
            <option value="10k_50k">10,000 – 50,000</option>
            <option value="50k_plus">50,000+</option>
          </select>
        </label>
      </div>
      <label className="ms-cr-form__field">
        <span className="ms-cr-form__label">Anything else (optional)</span>
        <textarea
          className="ec-input"
          rows={3}
          value={message}
          maxLength={1000}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <label className="ms-cr-form__check">
        <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} />
        <span>
          I am 18 or over. (Under-18s are welcome — rewards are product only, never cash.)
        </span>
      </label>
      <div className="ms-cr-form__grid ms-cr-form__grid--end">
        <span className="ms-cr-section__note">
          No follower minimum · every post carries #ad · you only ever see aggregates
        </span>
        <button
          type="button"
          className="ec-btn-primary inline-flex min-h-[48px] items-center gap-2 px-6"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? 'Sending…' : 'Ask for a space'}
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </button>
      </div>
      {error ? <p className="ms-cr-chip__note" role="alert">{error}</p> : null}
    </div>
  )
}
