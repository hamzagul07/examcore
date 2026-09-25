'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TeacherBackLink, TeacherPageContainer } from '@/components/teacher/TeacherPageChrome'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Field } from '@/components/ui/Field'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import {
  BOARDS,
  IB_BOARD_ID,
  IB_DIPLOMA_LEVEL,
  LEVELS,
  isIbBoard,
  subjectsForLevel,
} from '@/lib/profile-options'

type FieldName = 'name' | 'board' | 'level' | 'subject' | 'year_group' | 'description'

/**
 * A second (or tenth) class. Same board / level / subject fields as teacher
 * setup, so the new class starts with a syllabus (`subject_code`) the server
 * can resolve — without one, analytics and the question picker have nothing
 * to scope by and settings has to ask.
 */
export default function NewClassroomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [yearGroup, setYearGroup] = useState('')
  const [description, setDescription] = useState('')
  const [board, setBoard] = useState(BOARDS[0].id)
  const [level, setLevel] = useState('A-Level')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ message: string; field?: FieldName } | null>(null)

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

  const ready = Boolean(name.trim() && subject)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          year_group: yearGroup.trim(),
          board,
          level: effectiveLevel,
          subject,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        field?: FieldName
        classroom?: { id?: string }
      }
      if (!res.ok) {
        setError({ message: data.error || 'Could not create the class. Try again.', field: data.field })
        return
      }

      router.push(data.classroom?.id ? `/teacher/classroom/${data.classroom.id}` : '/teacher/classrooms')
      router.refresh()
    } catch {
      setError({ message: 'Could not reach the server. Check your connection and try again.' })
    } finally {
      setLoading(false)
    }
  }

  const fieldError = (field: FieldName) => (error?.field === field ? error.message : undefined)

  return (
    <TeacherPageContainer className="ms-teacher-form max-w-lg">
      <TeacherBackLink href="/teacher/classrooms">&lt;- Back to classes</TeacherBackLink>

      <div className="ms-teacher-start-card mx-auto">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">New class</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            +CL
          </span>
        </div>
        <h1 className="ms-teacher-start__title">
          File another <em>class</em>
        </h1>
        <p className="ms-teacher-start__lead">
          The board, level and subject tell us which syllabus to read the class&apos;s marks against.
          You get the invite code on the next screen.
        </p>

        <form onSubmit={handleSubmit} className="ms-teacher-start" noValidate>
          <Field
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="Class name"
            error={fieldError('name')}
            inputProps={{
              id: 'new-class-name',
              type: 'text',
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: 'e.g. 13B Mathematics',
              className: 'ms-teacher-start__input',
              required: true,
              maxLength: 120,
              disabled: loading,
              autoComplete: 'off',
            }}
          />

          <fieldset className="ms-teacher-start__field" disabled={loading}>
            <legend className="ms-teacher-start__legend" id="new-class-board">
              Exam board
            </legend>
            <SegmentedControl
              className="ms-teacher-start__choices"
              optionClassName="ms-teacher-start__choice"
              aria-labelledby="new-class-board"
              value={board}
              onChange={changeBoard}
              disabled={loading}
              options={BOARDS.filter((b) => b.enabled).map((b) => ({ value: b.id, label: b.label }))}
            />
          </fieldset>

          {!ib && (
            <fieldset className="ms-teacher-start__field" disabled={loading}>
              <legend className="ms-teacher-start__legend" id="new-class-level">
                Level
              </legend>
              <SegmentedControl
                className="ms-teacher-start__choices"
                optionClassName="ms-teacher-start__choice"
                aria-labelledby="new-class-level"
                value={level}
                onChange={changeLevel}
                disabled={loading}
                options={levelOptions.map((l) => ({ value: l.id, label: l.label }))}
              />
            </fieldset>
          )}

          <div className="ms-teacher-start__field">
            <label className="ms-teacher-start__legend" htmlFor="new-class-subject">
              Subject
            </label>
            <select
              id="new-class-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
              className="ec-input ms-teacher-start__input"
              required
              aria-invalid={error?.field === 'subject' || undefined}
            >
              <option value="">Choose a subject…</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label ?? s.id}
                </option>
              ))}
            </select>
          </div>

          <Field
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="Year group (optional)"
            error={fieldError('year_group')}
            inputProps={{
              id: 'new-class-year',
              type: 'text',
              value: yearGroup,
              onChange: (e) => setYearGroup(e.target.value),
              placeholder: 'e.g. Year 13',
              className: 'ms-teacher-start__input',
              maxLength: 40,
              disabled: loading,
              autoComplete: 'off',
            }}
          />

          <Field
            as="textarea"
            className="ms-teacher-start__field"
            labelClassName="ms-teacher-start__legend"
            label="Note to yourself (optional)"
            hint="Only you see this."
            error={fieldError('description')}
            inputProps={{
              id: 'new-class-desc',
              value: description,
              onChange: (e) => setDescription(e.target.value),
              rows: 3,
              maxLength: 500,
              disabled: loading,
              className: 'ms-teacher-start__input resize-none',
            }}
          />

          {error && !error.field ? <FormErrorAlert message={error.message} className="ms-teacher-start__error" /> : null}
          {error?.field === 'subject' || error?.field === 'board' || error?.field === 'level' ? (
            <FormErrorAlert message={error.message} className="ms-teacher-start__error" />
          ) : null}

          <button
            type="submit"
            disabled={!ready || loading}
            aria-busy={loading || undefined}
            className="ec-btn-primary ms-teacher-start__submit"
          >
            {loading ? (
              'Filing the class…'
            ) : (
              <>
                Create class
                <span className="font-mono text-[11px] font-bold" aria-hidden>
                  -&gt;
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </TeacherPageContainer>
  )
}
