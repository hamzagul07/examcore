'use client'

import { useState } from 'react'
import { Check, ThumbsDown, ThumbsUp } from 'lucide-react'

/**
 * "Was this marking fair?"
 *
 * Asked once, at the only moment the student has full context. It is the sole
 * direct read on marking quality — a score on its own can't tell a harsh-but-
 * correct mark from a wrong one — and, with explicit consent, the source of the
 * first real user voices on the site.
 *
 * Kept to one tap for the common case. The follow-up only appears when there is
 * something worth saying, so leaving feedback never feels like a form.
 */

type Rating = 'up' | 'down'

const DOWN_REASONS = [
  { value: 'too_harsh', label: 'Too harsh' },
  { value: 'too_generous', label: 'Too generous' },
  { value: 'misread_my_work', label: 'Misread my writing' },
  { value: 'wrong_mark_scheme', label: 'Wrong mark scheme' },
  { value: 'unclear_feedback', label: 'Feedback unclear' },
  { value: 'other', label: 'Something else' },
] as const

export function MarkFeedbackPrompt({ attemptId }: { attemptId: string }) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [shareConsent, setShareConsent] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(payload: {
    rating: Rating
    reason?: string | null
    comment?: string
    share_consent?: boolean
    display_name?: string
  }) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/mark/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: attemptId, ...payload }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Could not save your feedback')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your feedback')
      return false
    } finally {
      setSaving(false)
    }
  }

  // The rating is recorded on the first tap, before any follow-up. Someone who
  // taps and walks away has still told us the thing that matters most.
  async function handleRate(next: Rating) {
    setRating(next)
    await submit({ rating: next })
  }

  async function handleDetails() {
    if (!rating) return
    const ok = await submit({
      rating,
      reason,
      comment,
      share_consent: shareConsent,
      display_name: displayName,
    })
    if (ok) setDone(true)
  }

  if (done) {
    return (
      <div className="ec-card flex items-center gap-3 p-4">
        <Check className="h-5 w-5 shrink-0 text-[var(--ec-brand)]" aria-hidden="true" />
        <p className="text-sm text-[var(--ec-text-secondary)]">
          Thanks — this goes straight into how we tune the marking.
        </p>
      </div>
    )
  }

  return (
    <div className="ec-card space-y-4 border-[var(--ec-brand)]/30 bg-[var(--ec-brand)]/[0.03] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-[var(--ec-text-primary)]">
            Was this marking fair?
          </p>
          <p className="mt-0.5 text-sm text-[var(--ec-text-secondary)]">
            One tap — it&apos;s how we tune the marking, and how we know it&apos;s
            working.
          </p>
        </div>
        <div className="flex shrink-0 gap-2" role="group" aria-label="Rate this marking">
          <button
            type="button"
            disabled={saving}
            aria-pressed={rating === 'up'}
            onClick={() => void handleRate('up')}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold transition-colors ${
              rating === 'up'
                ? 'border-[var(--ec-brand)] bg-[var(--ec-brand)]/10 text-[var(--ec-brand)]'
                : 'border-[var(--ec-border)] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/50'
            }`}
          >
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            Fair
          </button>
          <button
            type="button"
            disabled={saving}
            aria-pressed={rating === 'down'}
            onClick={() => void handleRate('down')}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold transition-colors ${
              rating === 'down'
                ? 'border-[var(--ec-brand)] bg-[var(--ec-brand)]/10 text-[var(--ec-brand)]'
                : 'border-[var(--ec-border)] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/50'
            }`}
          >
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            Not fair
          </button>
        </div>
      </div>

      {rating === 'down' && (
        <div className="space-y-3 border-t border-[var(--ec-border)] pt-4">
          <p className="text-sm font-medium text-[var(--ec-text-primary)]">
            What went wrong?
          </p>
          <div className="flex flex-wrap gap-2">
            {DOWN_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                aria-pressed={reason === r.value}
                onClick={() => setReason(reason === r.value ? null : r.value)}
                className={`min-h-[36px] rounded-full border px-3 text-sm transition-colors ${
                  reason === r.value
                    ? 'border-[var(--ec-brand)] bg-[var(--ec-brand)]/10 text-[var(--ec-brand)]'
                    : 'border-[var(--ec-border)] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="sr-only">Anything else about this mark?</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Which mark was wrong, and what should it have been?"
              className="ec-input w-full resize-y text-sm"
            />
          </label>
        </div>
      )}

      {rating === 'up' && (
        <div className="space-y-3 border-t border-[var(--ec-border)] pt-4">
          <label className="block">
            <span className="text-sm font-medium text-[var(--ec-text-primary)]">
              Anything you&apos;d tell another student about it?
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Optional — what did the feedback actually help you see?"
              className="ec-input mt-2 w-full resize-y text-sm"
            />
          </label>
          {comment.trim().length > 0 && (
            <>
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={shareConsent}
                  onChange={(e) => setShareConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="text-sm text-[var(--ec-text-secondary)]">
                  You can show this on the site. We&apos;ll only use it with the
                  name below, and never your work or your marks.
                </span>
              </label>
              {shareConsent && (
                <label className="block">
                  <span className="sr-only">Name to show</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="Name to show — e.g. Aisha, Year 12"
                    className="ec-input w-full text-sm"
                  />
                </label>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--ec-error-ink,#c0392b)]" role="alert">
          {error}
        </p>
      )}

      {rating && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleDetails()}
          className="ec-btn-secondary min-h-[44px] w-full justify-center text-sm font-semibold"
        >
          {saving ? 'Sending…' : comment.trim() || reason ? 'Send feedback' : 'Done'}
        </button>
      )}
    </div>
  )
}
