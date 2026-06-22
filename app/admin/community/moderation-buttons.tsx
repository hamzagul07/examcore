'use client'

import { useState } from 'react'

export function ModerationButtons({
  targetType,
  targetId,
}: {
  targetType: 'note' | 'question' | 'answer'
  targetId: string
  status?: string
}) {
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function act(action: 'remove' | 'restore') {
    setBusy(true)
    try {
      const res = await fetch('/api/community/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, action }),
      })
      if (res.ok) setDone(action === 'remove' ? 'Removed' : 'Restored')
    } catch {
      /* ignore */
    }
    setBusy(false)
  }

  if (done) return <span style={{ color: 'var(--ec-text-faint)', fontSize: 13 }}>{done} ✓</span>

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" className="ec-btn-primary text-sm" onClick={() => act('restore')} disabled={busy}>
        Approve / restore
      </button>
      <button type="button" className="ec-btn-ghost text-sm" onClick={() => act('remove')} disabled={busy}>
        Remove
      </button>
    </div>
  )
}
