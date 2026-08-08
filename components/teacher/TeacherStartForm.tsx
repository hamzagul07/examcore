'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { completeOnboardingRequest } from '@/lib/onboarding/complete-onboarding-client'
import {
  BOARDS,
  IB_BOARD_ID,
  IB_DIPLOMA_LEVEL,
  LEVELS,
  isIbBoard,
  subjectsForLevel,
} from '@/lib/profile-options'

/**
 * Teacher setup — one screen.
 *
 * Deliberately not a branch of the five-step student wizard. A head of
 * department arriving from a cold email is giving this thirty seconds, and the
 * student flow asks them their exam year and revision goal, neither of which
 * they have. Four fields is the whole of what the server needs to create their
 * account and their first class.
 */
export function TeacherStartForm({ saveToken }: { saveToken: string }) {
  const [board, setBoard] = useState(BOARDS[0].id)
  const [level, setLevel] = useState('A-Level')
  const [subject, setSubject] = useState('')
  const [className, setClassName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ib = isIbBoard(board)
  const effectiveLevel = ib ? IB_DIPLOMA_LEVEL : level

  const levelOptions = useMemo(
    () => LEVELS.filter((l) => l.enabled && (ib ? l.id === IB_DIPLOMA_LEVEL : l.id !== IB_DIPLOMA_LEVEL)),
    [ib]
  )
  const subjectOptions = useMemo(() => subjectsForLevel(effectiveLevel), [effectiveLevel])

  // A subject chosen for one level often does not exist at another, so it is
  // cleared rather than silently submitted and rejected by the server.
  function changeBoard(next: string) {
    setBoard(next)
    setSubject('')
    if (next === IB_BOARD_ID) setLevel(IB_DIPLOMA_LEVEL)
    else if (level === IB_DIPLOMA_LEVEL) setLevel('A-Level')
  }

  function changeLevel(next: string) {
    setLevel(next)
    setSubject('')
  }

  const ready = Boolean(subject && className.trim())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || saving) return
    setSaving(true)
    setError('')

    try {
      const result = await completeOnboardingRequest(saveToken, {
        board,
        level: effectiveLevel,
        subjects: [subject],
        role: 'teacher',
        classroom_name: className.trim(),
      })

      if (!result.ok) {
        setError(result.error || 'Could not set up your account. Try again.')
        return
      }
      // Full navigation rather than a client push: the teacher area is behind a
      // role check that reads the profile written a moment ago.
      window.location.href = '/teacher/dashboard'
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="ms-teacher-start">
      <fieldset className="ms-teacher-start__field" disabled={saving}>
        <legend className="ms-teacher-start__legend">Which exam board do you teach?</legend>
        <div className="ms-teacher-start__choices">
          {BOARDS.filter((b) => b.enabled).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => changeBoard(b.id)}
              aria-pressed={board === b.id}
              className="ms-teacher-start__choice"
            >
              {b.label}
              {board === b.id && <Check className="h-4 w-4" aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      {!ib && (
        <fieldset className="ms-teacher-start__field" disabled={saving}>
          <legend className="ms-teacher-start__legend">Which level?</legend>
          <div className="ms-teacher-start__choices">
            {levelOptions.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => changeLevel(l.id)}
                aria-pressed={level === l.id}
                className="ms-teacher-start__choice"
              >
                {l.label}
                {level === l.id && <Check className="h-4 w-4" aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="ms-teacher-start__field">
        <label className="ms-teacher-start__legend" htmlFor="teacher-subject">
          What do you teach?
        </label>
        <select
          id="teacher-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={saving}
          className="ec-input ms-teacher-start__input"
        >
          <option value="">Choose a subject…</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label ?? s.id}
            </option>
          ))}
        </select>
      </div>

      <div className="ms-teacher-start__field">
        <label className="ms-teacher-start__legend" htmlFor="teacher-class">
          Name your first class
        </label>
        <input
          id="teacher-class"
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          disabled={saving}
          maxLength={120}
          placeholder="e.g. Year 12 Chemistry"
          className="ec-input ms-teacher-start__input"
          autoComplete="off"
        />
        <p className="ms-teacher-start__hint">
          You&apos;ll get a code to share with them. You can add more classes later.
        </p>
      </div>

      {error && <p className="ms-teacher-start__error">{error}</p>}

      <button type="submit" disabled={!ready || saving} className="ec-btn-primary ms-teacher-start__submit">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Setting up…
          </>
        ) : (
          <>
            Create my classroom <ArrowRight className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  )
}
