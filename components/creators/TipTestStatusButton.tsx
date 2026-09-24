'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function TipTestStatusButton({ id, status }: { id: string; status: 'active' | 'paused' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const next = status === 'active' ? 'paused' : 'active'
  return (
    <button
      type="button"
      className="ms-cr-copy"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await fetch(`/api/creators/tips/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: next }),
          })
          router.refresh()
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? '…' : status === 'active' ? 'Pause' : 'Resume'}
    </button>
  )
}
