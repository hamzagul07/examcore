'use client'

import { useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'

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
      <aside className="ms-mark-feedback flex items-center gap-3">
        <span className="ec-ink-stamp" aria-hidden>
          M1
        </span>
        <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
          Thanks — this goes straight into how we tune the marking.
        </p>
      </aside>
    )
  }

  return (
    <aside className="ms-mark-feedback space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="ms-mark-feedback__title">Was this marking fair?</p>
          <p className="ms-mark-feedback__lead">
            One tap — it&apos;s how we tune the marking, and how we know it&apos;s
            working.
          </p>
        </div>
        <SegmentedControl
          className="ms-mark-feedback__rate flex shrink-0 gap-2"
          optionClassName="ms-mark-feedback__rate-btn"
          aria-label="Rate this marking"
          value={rating}
          disabled={saving}
          onChange={(next) => void handleRate(next)}
          options={[
            {
              value: 'up',
              label: (
                <>
                  <span aria-hidden="true">✓</span>
                  Fair
                </>
              ),
            },
            {
              value: 'down',
              label: (
                <>
                  <span aria-hidden="true">×</span>
                  Not fair
                </>
              ),
            },
          ]}
        />
      </div>

      {rating === 'down' && (
        <div className="space-y-3 border-t border-[var(--ec-border)] pt-4">
          <p className="text-sm font-medium text-[var(--ec-text-primary)]">
            What went wrong?
          </p>
          <SegmentedControl
            className="flex flex-wrap gap-2"
            optionClassName="ms-mark-feedback__reason"
            aria-label="What went wrong"
            value={reason}
            onChange={(next) => setReason(reason === next ? null : next)}
            options={DOWN_REASONS.map((r) => ({
              value: r.value,
              label: r.label,
            }))}
          />
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

      {error ? <FormErrorAlert message={error} /> : null}

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
    </aside>
  )
}
