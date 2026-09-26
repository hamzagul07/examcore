'use client'

import { useMemo, useState } from 'react'
import { completeOnboardingRequest } from '@/lib/onboarding/complete-onboarding-client'
import { BOARDS, isIbBoard } from '@/lib/profile-options'
import { startLevelFor, startLevels, startSubjectGroups } from '@/lib/teacher/start-subjects'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Field } from '@/components/ui/Field'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'

/**
 * Teacher setup — one screen.
 *
 * Deliberately not a branch of the five-step student wizard. A head of
 * department arriving from a cold email is giving this thirty seconds, and the
 * student flow asks them their exam year and revision goal, neither of which
 * they have. Four fields is the whole of what the server needs to create their
 * account and their first class.
 */
export function TeacherStartForm() {
  const [board, setBoard] = useState(BOARDS[0].id)
  const [level, setLevel] = useState('A-Level')
  const [subject, setSubject] = useState('')
  const [className, setClassName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ib = isIbBoard(board)
  // Each board keeps its subjects in its own catalogue (IB, Edexcel units,
  // AQA/AP content codes), and not every board offers every level, so both
  // lists come from lib/teacher/start-subjects — the same options
  // save-profile accepts.
  const effectiveLevel = startLevelFor(board, level)

  const levelOptions = useMemo(() => startLevels(board), [board])
  const subjectGroups = useMemo(() => startSubjectGroups(board, effectiveLevel), [board, effectiveLevel])

  // A subject chosen for one level often does not exist at another, so it is
  // cleared rather than silently submitted and rejected by the server.
  function changeBoard(next: string) {
    setBoard(next)
    setSubject('')
    setLevel(startLevelFor(next, level))
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
      const result = await completeOnboardingRequest({
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
        <legend className="ms-teacher-start__legend" id="teacher-board-label">
          Which exam board do you teach?
        </legend>
        <SegmentedControl
          className="ms-teacher-start__choices"
          optionClassName="ms-teacher-start__choice"
          aria-labelledby="teacher-board-label"
          value={board}
          onChange={changeBoard}
          disabled={saving}
          options={BOARDS.filter((b) => b.enabled).map((b) => ({
            value: b.id,
            label: b.label,
          }))}
        />
      </fieldset>

      {!ib && levelOptions.length > 1 && (
        <fieldset className="ms-teacher-start__field" disabled={saving}>
          <legend className="ms-teacher-start__legend" id="teacher-level-label">
            Which level?
          </legend>
          <SegmentedControl
            className="ms-teacher-start__choices"
            optionClassName="ms-teacher-start__choice"
            aria-labelledby="teacher-level-label"
            value={effectiveLevel}
            onChange={changeLevel}
            disabled={saving}
            options={levelOptions.map((l) => ({
              value: l.id,
              label: l.label,
            }))}
          />
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
          {subjectGroups.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label ?? s.id}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <Field
        className="ms-teacher-start__field"
        labelClassName="ms-teacher-start__legend"
        label="Name your first class"
        hint="You'll get a code to share with them. You can add more classes later."
        inputProps={{
          id: 'teacher-class',
          type: 'text',
          value: className,
          onChange: (e) => setClassName(e.target.value),
          disabled: saving,
          maxLength: 120,
          placeholder: 'e.g. Year 12 Chemistry',
          className: 'ms-teacher-start__input',
          autoComplete: 'off',
        }}
      />
      <span className="ms-teacher-start__note" aria-hidden>
        four fields — then the invite code
      </span>

      {error ? (
        <FormErrorAlert message={error} className="ms-teacher-start__error" />
      ) : null}

      <button
        type="submit"
        disabled={!ready || saving}
        aria-busy={saving || undefined}
        className="ec-btn-primary ms-teacher-start__submit"
      >
        {saving ? (
          'Filing classroom…'
        ) : (
          <>
            Create my classroom
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              -&gt;
            </span>
          </>
        )}
      </button>
    </form>
  )
}
