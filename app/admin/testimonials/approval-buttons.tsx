'use client'

import { useState } from 'react'

export function ApprovalButtons({
  id,
  approved,
}: {
  id: string
  approved: boolean
}) {
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function act(action: 'approve' | 'unapprove') {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        setDone(action === 'approve' ? 'Published' : 'Unpublished')
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error || 'Failed.')
      }
    } catch {
      setError('Failed.')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <span style={{ color: 'var(--ec-text-faint)', fontSize: 13 }}>{done} ✓</span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {approved ? (
        <button
          type="button"
          className="ec-btn-ghost text-sm"
          onClick={() => act('unapprove')}
          disabled={busy}
        >
          Remove from homepage
        </button>
      ) : (
        <button
          type="button"
          className="ec-btn-primary text-sm"
          onClick={() => act('approve')}
          disabled={busy}
        >
          Publish to homepage
        </button>
      )}
      {error && (
        <span style={{ color: 'var(--ec-error-ink, #c0392b)', fontSize: 13 }}>
          {error}
        </span>
      )}
    </div>
  )
}
