'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TeacherBackLink,
  TeacherPageContainer,
} from '@/components/teacher/TeacherPageChrome'
import {
  BOARDS,
  IB_BOARD_ID,
  IB_DIPLOMA_LEVEL,
  LEVELS,
  isIbBoard,
  subjectsForLevel,
} from '@/lib/profile-options'

export default function NewClassroomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [board, setBoard] = useState(BOARDS[0].id)
  const [level, setLevel] = useState('A-Level')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ib = isIbBoard(board)
  const effectiveLevel = ib ? IB_DIPLOMA_LEVEL : level

  const levelOptions = useMemo(
    () =>
      LEVELS.filter((l) =>
        l.enabled && (ib ? l.id === IB_DIPLOMA_LEVEL : l.id !== IB_DIPLOMA_LEVEL)
      ),
    [ib]
  )
  const subjectOptions = useMemo(() => subjectsForLevel(effectiveLevel), [effectiveLevel])

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
    setError('')

    try {
      const res = await fetch('/api/teacher/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          board,
          level: effectiveLevel,
          subject,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.details || data.error || 'Failed to create classroom')
        return
      }

      const classroomId = data.classroom?.id as string | undefined
      if (classroomId) {
        router.push(`/teacher/classroom/${classroomId}`)
      } else {
        router.push('/teacher/dashboard')
      }
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TeacherPageContainer className="ms-teacher-form max-w-lg">
      <TeacherBackLink href="/teacher/dashboard">&lt;- Back to dashboard</TeacherBackLink>

      <div className="ms-teacher-start-card mx-auto">
        <div className="mb-2 flex items-center gap-2">
          <p className="ec-eyebrow mb-0">New classroom</p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            +CL
          </span>
        </div>
        <h1 className="ms-teacher-start__title">
          File another <em>class</em>
        </h1>
        <p className="ms-teacher-start__lead">
          Same board and subject fields as setup — so the invite isn&apos;t floating without a
          syllabus.
        </p>

        <form onSubmit={handleSubmit} className="ms-teacher-start">
          <div className="ms-teacher-start__field">
            <label className="ms-teacher-start__legend" htmlFor="new-class-name">
              Class name
            </label>
            <input
              id="new-class-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Year 13 A-Level Maths"
              className="ec-input ms-teacher-start__input"
              required
              maxLength={120}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <fieldset className="ms-teacher-start__field" disabled={loading}>
            <legend className="ms-teacher-start__legend">Exam board</legend>
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
                </button>
              ))}
            </div>
          </fieldset>

          {!ib && (
            <fieldset className="ms-teacher-start__field" disabled={loading}>
              <legend className="ms-teacher-start__legend">Level</legend>
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
                  </button>
                ))}
              </div>
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
            <label className="ms-teacher-start__legend" htmlFor="new-class-desc">
              Note (optional)
            </label>
            <textarea
              id="new-class-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="ec-input ms-teacher-start__input resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          {error ? (
            <p className="ms-teacher-start__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!ready || loading}
            aria-busy={loading || undefined}
            className="ec-btn-primary ms-teacher-start__submit"
          >
            {loading ? (
              'Filing classroom…'
            ) : (
              <>
                Create classroom
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
