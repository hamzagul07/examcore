'use client'

import { useState } from 'react'
import { Check, X, MessageSquare, Save } from 'lucide-react'
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

export function OverrideConsole({ attempt, onSubmit }: Props) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      attempt.marks_awarded.map((m) => [String(m.mark_id), m.earned])
    )
  )
  const [teacherNote, setTeacherNote] = useState('')
  const [saving, setSaving] = useState(false)

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
    const newMarksAwarded = attempt.marks_awarded.map((m) => ({
      ...m,
      earned: overrides[String(m.mark_id)],
      teacher_overridden: overrides[String(m.mark_id)] !== m.earned,
    }))

    await fetch(`/api/teacher/attempt/${attempt.id}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        override_marks_awarded: newMarksAwarded,
        override_total_earned: calculateNewTotal(),
        teacher_notes: teacherNote,
      }),
    })

    setSaving(false)
    onSubmit?.()
  }

  const aiTotal = attempt.marks_earned
  const newTotal = calculateNewTotal()

  return (
    <div className="ec-card flex h-full flex-col p-6">
      <div className="mb-6">
        <div className="ec-label-tech mb-2">OVERRIDE CONSOLE</div>
        <h3 className="text-2xl font-bold text-white">Modify AI marking</h3>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="ec-card p-4">
          <div className="mb-1 text-xs text-slate-400">AI SCORE</div>
          <div className="text-3xl font-bold text-white">
            {aiTotal}/{attempt.total_marks}
          </div>
        </div>
        <div
          className={`ec-card p-4 ${newTotal !== aiTotal ? 'border border-emerald-500/40' : ''}`}
        >
          <div className="mb-1 text-xs text-emerald-400">YOUR SCORE</div>
          <div className="text-3xl font-bold text-emerald-400">
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
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-emerald-500/30"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 font-mono text-sm text-emerald-300">
                {m.mark_id}
              </span>
              <span className="truncate text-sm text-white">
                {m.reasoning?.slice(0, 60)}
              </span>
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                overrides[String(m.mark_id)]
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {overrides[String(m.mark_id)] ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label className="ec-label-tech mb-2 block">
          <MessageSquare className="mr-1 inline h-3 w-3" />
          ADD TEACHER NOTE (becomes handwritten margin note)
        </label>
        <textarea
          value={teacherNote}
          onChange={(e) => setTeacherNote(e.target.value)}
          placeholder="e.g. Excellent method but check your algebra carefully..."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none"
          rows={3}
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="ec-btn-primary inline-flex w-full items-center justify-center gap-2"
      >
        <Save className="h-5 w-5" />
        {saving ? 'Submitting...' : 'Submit override to student'}
      </button>
    </div>
  )
}
