'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'

const DECLINE_REASON_MIN = 8

/**
 * Approve / Decline for one pending seat request. Decline asks for a reason
 * first, because the teacher sees it on their desk and in the email — it is
 * the only thing that tells them what to fix. Approve records the school they
 * gave when the reason is left blank.
 */
export function SeatDecision({ requestId, school }: { requestId: string; school: string }) {
  const router = useRouter()
  const reasonId = useId()
  const hintId = useId()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)

  async function decide(action: 'approve' | 'decline') {
    if (busy) return
    if (action === 'decline' && reason.trim().length < DECLINE_REASON_MIN) {
      setError('Write the reason first — the teacher sees it and needs to know what to fix.')
      return
    }
    setBusy(action)
    setError('')
    try {
      const res = await fetch('/api/admin/teacher-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action, reason: reason.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean }
      if (!res.ok) {
        setError(data.error || 'Could not save the decision. Try again.')
        return
      }
      setDone(
        `${action === 'approve' ? 'Approved' : 'Declined'} — ${school}.${
          data.emailed ? ' The teacher has been emailed.' : ' Email not sent; tell them by hand.'
        }`
      )
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  if (done) {
    return (
      <p className="ms-seat-queue__decide text-sm text-[var(--ec-text-secondary)]" role="status" aria-live="polite">
        {done}
      </p>
    )
  }

  return (
    <div className="ms-seat-queue__decide">
      <label htmlFor={reasonId} className="text-sm font-semibold text-[var(--ec-text-primary)]">
        Reason
      </label>
      <textarea
        id={reasonId}
        aria-describedby={hintId}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        disabled={busy !== null}
        className="ec-input w-full resize-y"
        placeholder="Required to decline — e.g. “Please apply with your school email address.”"
      />
      <p id={hintId} className="text-xs text-[var(--ec-text-secondary)]">
        Shown to the teacher when you decline. Leave blank to approve: the school they gave is recorded.
      </p>
      {error ? <FormErrorAlert message={error} /> : null}
      <div className="ms-seat-queue__buttons">
        <button
          type="button"
          onClick={() => void decide('approve')}
          disabled={busy !== null}
          aria-busy={busy === 'approve' || undefined}
          className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
        >
          {busy === 'approve' ? 'Approving…' : 'Approve seat'}
        </button>
        <button
          type="button"
          onClick={() => void decide('decline')}
          disabled={busy !== null}
          aria-busy={busy === 'decline' || undefined}
          className="ms-teacher-danger__btn"
        >
          {busy === 'decline' ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </div>
  )
}
