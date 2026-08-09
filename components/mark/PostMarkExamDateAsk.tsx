'use client'

import { useState } from 'react'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Field } from '@/components/ui/Field'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { FormSuccessStatus } from '@/components/ui/FormSuccessStatus'

const DISMISS_KEY = 'ms-exam-date-ask-dismissed'

type Props = {
  onSaved: (date: string) => void
  onDismiss: () => void
}

/**
 * R3 — ask for exam date after the first mark (and after target grade), not in signup.
 * Powers the dashboard countdown when the student is ready to care about it.
 */
export function PostMarkExamDateAsk({ onSaved, onDismiss }: Props) {
  const suggestions = suggestedExamDates()
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function save(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrorMsg('Pick a valid exam date.')
      return
    }
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_date: date }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setErrorMsg(data?.error ?? 'Couldn’t save your exam date.')
        return
      }
      setSuccessMsg('Exam date saved — countdown is on your dashboard.')
      onSaved(date)
      try {
        sessionStorage.setItem(DISMISS_KEY, '1')
      } catch {
        /* ignore */
      }
    } catch {
      setErrorMsg('Couldn’t save your exam date. Check your connection.')
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
    <aside className="ms-mark-example-slip" aria-label="Set your exam date">
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          T
        </span>
        <div className="ms-mark-example-slip__copy min-w-0">
          <p className="ms-mark-example-slip__title">When is the exam?</p>
          <p className="ms-mark-example-slip__lead">
            Optional — we&apos;ll put a countdown on your dashboard so the date stays visible.
          </p>
          <div className="mt-3">
            <SegmentedControl
              aria-label="Suggested exam session"
              value={null}
              onChange={(d) => {
                if (saving) return
                void save(d)
              }}
              disabled={saving}
              className="ms-exam-pills flex flex-wrap gap-2"
              optionClassName="ec-pill"
              options={suggestions.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>
          <div className="mt-3 max-w-xs">
            <Field
              label="Or pick a date"
              labelClassName="label-overline mb-2 inline-block"
              inputProps={{
                type: 'date',
                value: custom,
                disabled: saving,
                onChange: (e) => setCustom(e.target.value),
                onBlur: () => {
                  if (custom && !saving) void save(custom)
                },
              }}
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

export function wasExamDateAskDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}
