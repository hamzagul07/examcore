'use client'

import { useState } from 'react'
import { MathText } from '@/components/MathText'
import type { MarkAwarded } from '@/components/MarkingResultView'

interface AttemptForOverride {
  id: string
  marks_earned: number
  total_marks: number
  marks_awarded: MarkAwarded[]
}

interface Props {
  attempt: AttemptForOverride
  onSubmit?: () => void
}

/**
 * One sentence for a refused override. A 422 carries per-field messages from
 * lib/teacher/override.ts (`override_marks_awarded[3].reasoning: must be at
 * most 500 characters`); the first is shown with its field so the teacher
 * knows what to shorten rather than seeing "Invalid override payload".
 */
function describeOverrideFailure(
  status: number,
  data: { error?: string; errors?: Record<string, string> }
): string {
  const entries = data.errors ? Object.entries(data.errors) : []
  if (status === 422 && entries.length > 0) {
    const [field, message] = entries[0]
    const label = field
      .replace(/^override_marks_awarded\[(\d+)\]\.?/, (_m, i) => `mark ${Number(i) + 1} `)
      .replace(/^override_total_earned$/, 'total')
      .replace(/^teacher_notes$/, 'note')
      .replace(/_/g, ' ')
      .trim()
    const more = entries.length > 1 ? ` (${entries.length - 1} more)` : ''
    return `Not saved — ${label}: ${message}${more}.`
  }
  if (status === 401) return 'Not saved — your session has expired. Sign in again and retry.'
  if (status === 403) return 'Not saved — this attempt is not in one of your classrooms.'
  return `Not saved — ${data.error || 'something went wrong'}. Try again.`
}

export function OverrideConsole({ attempt, onSubmit }: Props) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      attempt.marks_awarded.map((m) => [String(m.mark_id), m.earned])
    )
  )
  const [teacherNote, setTeacherNote] = useState('')
  const [saving, setSaving] = useState(false)
  /**
   * Why the last submit was refused, if it was. The console used to call
   * onSubmit() without reading the response, so a 422 from the validator
   * (or any failure) closed the panel and reported success while nothing
   * had been written to the attempt.
   */
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggleMark(markId: string | number) {
    const key = String(markId)
    setOverrides((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function calculateNewTotal() {
    return attempt.marks_awarded.reduce(
      (sum, m) => sum + (overrides[String(m.mark_id)] ? 1 : 0),
      0
    )
  }

  async function submit() {
    setSaving(true)
    setSubmitError(null)
    const newMarksAwarded = attempt.marks_awarded.map((m) => ({
      ...m,
      earned: overrides[String(m.mark_id)],
      teacher_overridden: overrides[String(m.mark_id)] !== m.earned,
    }))

    try {
      const res = await fetch(`/api/teacher/attempt/${attempt.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          override_marks_awarded: newMarksAwarded,
          override_total_earned: calculateNewTotal(),
          teacher_notes: teacherNote,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          errors?: Record<string, string>
        }
        setSubmitError(describeOverrideFailure(res.status, data))
        return
      }
      onSubmit?.()
    } catch {
      setSubmitError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const aiTotal = attempt.marks_earned
  const newTotal = calculateNewTotal()

  return (
    <div className="ms-override-console ec-card flex h-full flex-col p-4 sm:p-6">
      <div className="mb-6">
        <div className="ec-label-tech mb-2">OVERRIDE CONSOLE</div>
        <h3 className="text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl">Modify AI marking</h3>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="ec-card ec-card--paper p-4">
          <div className="mb-1 text-xs text-[var(--ec-text-secondary)]">AI SCORE</div>
          <div className="text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
            {aiTotal}/{attempt.total_marks}
          </div>
        </div>
        <div
          className={`ec-card ec-card--paper p-4 ${newTotal !== aiTotal ? 'border border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)]' : ''}`}
        >
          <div className="mb-1 text-xs ec-text-brand">YOUR SCORE</div>
          <div className="text-2xl font-bold ec-score-high sm:text-3xl">
            {newTotal}/{attempt.total_marks}
          </div>
        </div>
      </div>

      <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
        <div className="ec-label-tech mb-2">INDIVIDUAL MARKS</div>
        {attempt.marks_awarded.map((m) => (
          <button
            key={String(m.mark_id)}
            type="button"
            onClick={() => toggleMark(m.mark_id)}
            className="flex min-h-[56px] w-full items-center justify-between ec-card ec-card--paper border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-3 transition-all hover:border-[color-mix(in_srgb,var(--ec-brand)_30%,transparent)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-md bg-[var(--ec-surface-raised)] px-2 py-1 font-mono text-sm ec-score-high">
                {m.mark_id}
              </span>
              <span className="line-clamp-1 text-sm text-[var(--ec-text-primary)]">
                {m.reasoning ? <MathText text={m.reasoning} /> : null}
              </span>
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ${
                overrides[String(m.mark_id)]
                  ? 'ec-tint-success-chip border-0'
                  : 'ec-tint-critical-chip border-0'
              }`}
            >
              <span className="font-mono text-sm font-bold" aria-hidden>
                {overrides[String(m.mark_id)] ? '✓' : '×'}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="ec-label-tech mb-2 block">
          <span className="mr-1 font-mono text-[10px] font-bold tracking-wide" aria-hidden>
            NB
          </span>
          ADD TEACHER NOTE (becomes handwritten margin note)
        </label>
        <textarea
          value={teacherNote}
          onChange={(e) => setTeacherNote(e.target.value)}
          placeholder="e.g. Excellent method but check your algebra carefully..."
          className="ec-input w-full resize-none"
          rows={3}
        />
      </div>

      {submitError ? (
        <p
          role="alert"
          className="mb-3 rounded-md border border-[color-mix(in_srgb,var(--ec-critical,#b91c1c)_40%,transparent)] px-3 py-2 text-sm text-[var(--ec-text-primary)]"
        >
          {submitError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="ec-btn-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2"
      >
        <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
          OK
        </span>
        {saving ? 'Submitting...' : 'Submit override to student'}
      </button>
    </div>
  )
}
