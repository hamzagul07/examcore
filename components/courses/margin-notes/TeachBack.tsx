'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { TeachBackResult } from '@/lib/courses/teach-back'

type Props = {
  subjectCode: string
  lessonSlug: string
  practiceHref?: string | null
  practiceRef?: string
  /** Fired once when a gap check returns successfully. */
  onComplete?: () => void
}

const VERDICT_LABEL: Record<TeachBackResult['verdict'], string> = {
  solid: 'Solid',
  partial: 'Partial',
  thin: 'Thin',
}

/**
 * Feynman teach-back — explain the topic, get the missing mark-earning ideas.
 * High-signal, paper-slip UI that hands off to marking.
 */
export function TeachBack({
  subjectCode,
  lessonSlug,
  practiceHref,
  practiceRef,
  onComplete,
}: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<(TeachBackResult & { title?: string }) | null>(
    null
  )
  const completedRef = useRef(false)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/courses/teach-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode, lessonSlug, explanation: text }),
      })
      const data = (await res.json()) as TeachBackResult & {
        title?: string
        error?: string
      }
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setResult(null)
        return
      }
      setResult(data)
      if (!completedRef.current) {
        completedRef.current = true
        onComplete?.()
      }
    } catch {
      setError('Could not reach the gap check. Try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tb-panel" data-screen-label="Lesson — teach back">
      <div className="tb-head">
        <span className="tb-stamp mono" aria-hidden>
          TB
        </span>
        <div>
          <p className="tb-eyebrow micro">Teach it back</p>
          <p className="tb-lead body-2">
            Explain this topic as if teaching a friend. We name the gaps an examiner
            would still dock.
          </p>
        </div>
      </div>

      <label className="tb-label micro" htmlFor="tb-explain">
        Your explanation — no notes
      </label>
      <textarea
        id="tb-explain"
        className="tb-input"
        rows={5}
        value={text}
        placeholder="In your own words: what is this, why it works, and what you’d write in an exam…"
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />

      <div className="tb-actions">
        <button
          type="button"
          className="tb-run"
          onClick={() => void run()}
          disabled={loading || text.trim().length < 24}
        >
          {loading ? 'Reading your explanation…' : 'Find the gaps'}
        </button>
        {text.trim().length > 0 && text.trim().length < 24 ? (
          <span className="micro tb-hint">A few more sentences unlock the check.</span>
        ) : null}
      </div>

      {error ? (
        <p className="tb-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className={`tb-result tb-result--${result.verdict}`} role="status">
          <div className="tb-result-meta">
            <span className="tb-verdict mono">{VERDICT_LABEL[result.verdict]}</span>
            <p className="tb-summary">{result.summary}</p>
          </div>
          {result.gaps.length > 0 ? (
            <ul className="tb-gaps">
              {result.gaps.map((g) => (
                <li key={g.idea}>
                  <span className="tb-gap-idea">{g.idea}</span>
                  <span className="tb-gap-why">{g.why}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="micro tb-clear">No major gaps — prove it on a real question.</p>
          )}
          {practiceHref ? (
            <Link className="tb-cta" href={practiceHref}>
              Now do the real thing
              {practiceRef && practiceRef.length <= 24 ? ` — ${practiceRef}` : ''} →
            </Link>
          ) : null}
          <button
            type="button"
            className="tb-retry"
            onClick={() => {
              setResult(null)
              setError(null)
            }}
          >
            Rewrite my explanation
          </button>
        </div>
      ) : null}
    </div>
  )
}
