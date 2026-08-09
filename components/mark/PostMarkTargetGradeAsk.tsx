'use client'

import { useState } from 'react'
import { isIbBoard } from '@/lib/profile-options'
import { targetGradeOptions } from '@/lib/target-grade'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { FormSuccessStatus } from '@/components/ui/FormSuccessStatus'

const DISMISS_KEY = 'ms-target-grade-ask-dismissed'

type Props = {
  /** Profile board string (e.g. Cambridge International / IB). */
  board: string
  onSaved: (grade: string) => void
  onDismiss: () => void
}

/**
 * ON-01 / R3 — ask for target grade after the first mark, not during signup.
 */
export function PostMarkTargetGradeAsk({ board, onSaved, onDismiss }: Props) {
  const options = targetGradeOptions(isIbBoard(board))
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function save(grade: string) {
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_grade: grade }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setErrorMsg(data?.error ?? 'Couldn’t save your target grade.')
        return
      }
      setSuccessMsg(`Target set to ${grade}.`)
      onSaved(grade)
      try {
        sessionStorage.setItem(DISMISS_KEY, '1')
      } catch {
        /* ignore */
      }
    } catch {
      setErrorMsg('Couldn’t save your target grade. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    onDismiss()
  }

  return (
    <aside className="ms-mark-example-slip" aria-label="Set a target grade">
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          A*
        </span>
        <div className="ms-mark-example-slip__copy min-w-0">
          <p className="ms-mark-example-slip__title">Want a target to aim at?</p>
          <p className="ms-mark-example-slip__lead">
            Optional — we&apos;ll show how this mark sits against your goal on Progress.
          </p>
          <div className="mt-3">
            <SegmentedControl
              aria-label="Target grade"
              value={null}
              onChange={(g) => {
                if (saving) return
                void save(g)
              }}
              disabled={saving}
              className="ms-ob-stamp-pick flex flex-wrap gap-2"
              optionClassName="ms-ob-stamp-pick__btn"
              options={options.map((g) => ({ value: g, label: g }))}
            />
          </div>
          {errorMsg ? <FormErrorAlert message={errorMsg} className="mt-3" /> : null}
          {successMsg ? <FormSuccessStatus message={successMsg} className="mt-3" /> : null}
        </div>
      </div>
      <button
        type="button"
        className="ms-mark-example-slip__cta inline-flex min-h-[44px] items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-text-secondary)]"
        onClick={dismiss}
        disabled={saving}
      >
        Not now
      </button>
    </aside>
  )
}

export function wasTargetGradeAskDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}
