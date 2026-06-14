'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'
import { suggestedExamDates } from '@/lib/dashboard/exam-date'
import {
  SettingsFieldGroup,
  SettingsSectionCard,
} from '@/components/settings/SettingsSectionCard'

type Props = {
  initialProfile: {
    full_name: string
    board: string
    level: string
    subjects: string[]
    exam_date: string
  }
}

export function ExamSection({ initialProfile }: Props) {
  const [examDate, setExamDate] = useState(initialProfile.exam_date)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const suggestions = suggestedExamDates()

  async function save(nextDate: string | null) {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: initialProfile.full_name.trim() || null,
        board: initialProfile.board,
        level: initialProfile.level,
        subjects: initialProfile.subjects,
        exam_date: nextDate,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || 'Could not save your exam date. Try again.')
      return false
    }
    setExamDate(nextDate ?? '')
    setSuccessMsg(nextDate ? 'Exam date saved.' : 'Exam date cleared.')
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await save(examDate || null)
  }

  async function handleClear() {
    await save(null)
  }

  return (
    <SettingsSectionCard
      title="Exam date"
      description="This powers your countdown on the dashboard home page."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="ms-exam-pills flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={loading}
              onClick={() => setExamDate(s.value)}
              className={`ec-pill ${examDate === s.value ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <SettingsFieldGroup label="Specific date">
          <input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="ec-input"
          />
        </SettingsFieldGroup>

        <p className="text-caption">
          Tip: Setting a date shows a live countdown on your dashboard — great for
          staying focused through exam season.
        </p>

        {errorMsg && <ErrorBox message={errorMsg} />}
        {successMsg && <SuccessBox message={successMsg} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            loadingText="Saving..."
          >
            Save exam date
          </Button>
          {examDate && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={loading}
              onClick={() => void handleClear()}
            >
              Clear date
            </Button>
          )}
        </div>
      </form>
    </SettingsSectionCard>
  )
}
