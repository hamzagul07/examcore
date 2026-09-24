'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/admin/creators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  return { ok: !!data.ok && res.ok, error: data.error }
}

/** Approve (grants the seat) or decline one application. */
export function ApplicationActions({
  applicationId,
  suggestedCode,
}: {
  applicationId: string
  suggestedCode: string
}) {
  const router = useRouter()
  const [code, setCode] = useState(suggestedCode)
  const [gift, setGift] = useState('5')
  const [pool, setPool] = useState('200')
  const [isAdult, setIsAdult] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'idle' | 'approve' | 'decline'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function run(action: 'approve' | 'decline') {
    setBusy(action)
    setError(null)
    const result = await post({
      action,
      applicationId,
      code,
      giftMarks: Number(gift),
      giftPoolMonthly: Number(pool),
      isAdult,
      reason,
    })
    setBusy('idle')
    if (!result.ok) {
      setError(result.error ?? 'Failed')
      return
    }
    router.refresh()
  }

  return (
    <div className="ms-cr-form" style={{ marginTop: 12 }}>
      <div className="ms-cr-form__grid ms-cr-form__grid--three">
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Code</span>
          <input
            className="ec-input"
            value={code}
            maxLength={12}
            style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Gift marks</span>
          <input className="ec-input" type="number" min={0} max={50} value={gift} onChange={(e) => setGift(e.target.value)} />
        </label>
        <label className="ms-cr-form__field">
          <span className="ms-cr-form__label">Monthly pool</span>
          <input className="ec-input" type="number" min={0} max={5000} value={pool} onChange={(e) => setPool(e.target.value)} />
        </label>
      </div>
      <label className="ms-cr-form__field">
        <span className="ms-cr-form__label">Reason / note (kept on the seat)</span>
        <input className="ec-input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="ms-cr-form__check">
        <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} />
        <span>Verified 18+ from evidence (cash eligibility later; not from the form)</span>
      </label>
      <div className="ms-cr-form__grid ms-cr-form__grid--end">
        <button
          type="button"
          className="ec-btn-ghost inline-flex min-h-[40px] items-center px-4"
          disabled={busy !== 'idle'}
          onClick={() => void run('decline')}
        >
          {busy === 'decline' ? '…' : 'Decline'}
        </button>
        <button
          type="button"
          className="ec-btn-primary inline-flex min-h-[40px] items-center px-5"
          disabled={busy !== 'idle'}
          onClick={() => void run('approve')}
        >
          {busy === 'approve' ? 'Granting…' : 'Approve and grant seat'}
        </button>
      </div>
      {error ? <p className="ms-cr-chip__note" role="alert">{error}</p> : null}
    </div>
  )
}

export function SeatToggle({ userId, status }: { userId: string; status: 'active' | 'paused' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="ms-cr-copy"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await post({ action: status === 'active' ? 'pause' : 'resume', userId })
        setBusy(false)
        router.refresh()
      }}
    >
      {busy ? '…' : status === 'active' ? 'Pause' : 'Resume'}
    </button>
  )
}
