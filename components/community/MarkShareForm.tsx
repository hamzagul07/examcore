'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { markGap, markShareComment, type MarkComponent } from '@/lib/community/mark-share'

const DRAFT_KEY = 'ms:community:mark-share'

/**
 * Share a mark in two fields instead of a paragraph.
 *
 * The threshold threads ask readers to "post your component and raw mark", and
 * then hand them an empty prose box — which is the hardest possible version of
 * that request. Picking a paper and typing a number is the same contribution at
 * a fraction of the effort, and the gap is calculated and shown before they
 * commit, so the value arrives before the ask rather than after it.
 *
 * What gets posted is an ordinary comment in the student's own voice. Nothing
 * here is attributed to anyone who did not type it.
 */
export function MarkShareForm({
  postId,
  subjectCode,
  components,
  signedIn,
}: {
  postId: string
  subjectCode: string
  components: MarkComponent[]
  signedIn: boolean
}) {
  const router = useRouter()
  const [componentId, setComponentId] = useState('')
  const [rawMark, setRawMark] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [posted, setPosted] = useState(false)

  const chosen = components.find((c) => c.component === componentId) ?? null
  const raw = Number(rawMark)
  const valid = !!chosen && rawMark !== '' && Number.isFinite(raw) && raw >= 0 && raw <= chosen.max

  // Computed as they type: the reader sees what they get before deciding
  // whether to post it.
  const preview = useMemo(() => (chosen && valid ? markGap(chosen, raw) : null), [chosen, valid, raw])

  async function submit() {
    if (!chosen || !valid) return
    setError('')

    const body = markShareComment(chosen, raw, markGap(chosen, raw))

    if (!signedIn) {
      try {
        window.localStorage.setItem(`ms:community:draft:${postId}:top`, body)
      } catch {
        /* they can retype it — never block the redirect on storage */
      }
      router.push(`/auth/signin?next=${encodeURIComponent(`/community/posts/${postId}`)}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyMd: body, subjectName: subjectCode }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Could not post that. Try again.')
        setSubmitting(false)
        return
      }
      setPosted(true)
      setRawMark('')
      router.refresh()
    } catch {
      setError('Something went wrong.')
    }
    setSubmitting(false)
  }

  if (!components.length) return null

  if (posted) {
    return (
      <div className="rc-markshare rc-markshare--done">
        <p className="ms-body-2" style={{ margin: 0 }}>
          Posted — thanks. Add another paper if you want the full picture.
        </p>
        <button type="button" className="rc-btn rc-btn-ghost" onClick={() => setPosted(false)}>
          Add another
        </button>
      </div>
    )
  }

  return (
    <div className="rc-markshare">
      <p className="rc-markshare__title">Share a mark — two fields, no writing</p>

      <div className="rc-markshare__row">
        <label className="rc-markshare__field">
          <span className="rc-markshare__label">Paper</span>
          <select
            className="rc-input"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
          >
            <option value="">Choose…</option>
            {components.map((c) => (
              <option key={c.component} value={c.component}>
                {c.paper} ({c.component}) · out of {c.max}
              </option>
            ))}
          </select>
        </label>

        <label className="rc-markshare__field rc-markshare__field--mark">
          <span className="rc-markshare__label">Your raw mark</span>
          <input
            className="rc-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={chosen?.max ?? undefined}
            value={rawMark}
            onChange={(e) => setRawMark(e.target.value)}
            placeholder={chosen ? `0–${chosen.max}` : '—'}
            disabled={!chosen}
          />
        </label>
      </div>

      {preview && chosen ? (
        <p className="rc-markshare__preview">
          {preview.grade ? (
            <>
              That is a <strong>{preview.grade}</strong> on this paper
              {preview.toNext !== null && preview.nextGrade ? (
                <>
                  {' '}
                  — <strong>{preview.toNext}</strong> off the {preview.nextGrade}
                </>
              ) : null}
              .
            </>
          ) : (
            <>That is below the lowest published threshold on this paper.</>
          )}
        </p>
      ) : null}

      {error ? <p className="rc-error">{error}</p> : null}

      <div className="rc-markshare__actions">
        <button
          type="button"
          className="rc-btn rc-btn-primary"
          onClick={submit}
          disabled={!valid || submitting}
        >
          {submitting ? 'Posting…' : signedIn ? 'Post my mark' : 'Sign in to post'}
        </button>
        {chosen && rawMark !== '' && !valid ? (
          <span className="rc-markshare__hint">Enter a mark between 0 and {chosen.max}.</span>
        ) : null}
      </div>
    </div>
  )
}
