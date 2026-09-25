'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FEEDBACK_MAX } from '@/lib/teacher/assignments/validate'
import type { StudentAssignmentState } from '@/lib/teacher/types'
import { Button } from '@/components/ui/Button'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { Sheet } from '@/components/ui/Sheet'
import { DueDatePicker } from '@/components/teacher/assignments/DueDatePicker'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { sameMinute } from '@/components/teacher/assignments/format'
import {
  LATE_GROUP_ORDER,
  LATE_GROUP_TITLE,
  extensionBase,
  handedInPhrase,
  isValidExtension,
  lateGroups,
  type LateRow,
} from '@/components/teacher/assignments/late-groups'

type FieldErrors = Partial<Record<'excused' | 'extended_due_at' | 'feedback' | 'body', string>>

function FlagsForm({
  classroomId,
  assignment,
  row,
  titleId,
  onDone,
  onCancel,
}: {
  classroomId: string
  assignment: { id: string; title: string; due_at: string | null }
  row: LateRow
  titleId: string
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const uid = useId()
  const [excused, setExcused] = useState(row.excused)
  const [extension, setExtension] = useState<string | null>(row.extended_due_at)
  const [note, setNote] = useState(row.feedback ?? '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  const base = extensionBase(assignment.due_at, row.extended_due_at)
  const patch: Record<string, unknown> = {}
  if (excused !== row.excused) patch.excused = excused
  if (!sameMinute(extension, row.extended_due_at) && !(extension === null && row.extended_due_at === null)) {
    patch.extended_due_at = extension
  }
  if (note.trim() !== (row.feedback ?? '').trim()) patch.feedback = note.trim() ? note : null
  const dirty = Object.keys(patch).length > 0

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty || saving) return
    if ('extended_due_at' in patch && extension !== null && !isValidExtension(extension, assignment.due_at)) {
      setErrors({ extended_due_at: 'Pick a deadline after the set’s own due date.' })
      return
    }
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(
        `/api/teacher/classroom/${encodeURIComponent(classroomId)}/assignments/${encodeURIComponent(
          assignment.id
        )}/students/${encodeURIComponent(row.student_id)}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string }
      if (!res.ok) {
        const field = data.field === 'excused' || data.field === 'extended_due_at' || data.field === 'feedback' ? data.field : 'body'
        setErrors({ [field]: data.error || 'Could not save that change. Try again.' })
        return
      }
      const parts: string[] = []
      if ('excused' in patch) parts.push(excused ? 'excused' : 'no longer excused')
      if ('extended_due_at' in patch) parts.push(extension ? 'given an extension' : 'extension removed')
      if ('feedback' in patch) parts.push(note.trim() ? 'note saved' : 'note removed')
      onDone(`${row.name}: ${parts.join(', ')}.`)
    } catch {
      setErrors({ body: 'Could not reach the server. Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <div>
        <h2 id={titleId} className="ms-teacher-confirm__title">
          {row.name}
        </h2>
        <p className="m-0 text-sm text-[var(--ec-text-secondary)]">
          {assignment.title} · {handedInPhrase(row)}
        </p>
      </div>

      <label htmlFor={`${uid}-excused`} className="ms-teacher-settings__toggle">
        <input
          id={`${uid}-excused`}
          type="checkbox"
          role="switch"
          checked={excused}
          onChange={(e) => setExcused(e.target.checked)}
        />
        <span>
          Excused from this set
          <small>They aren&apos;t chased or counted as missing. Work they hand in still counts.</small>
        </span>
      </label>
      {errors.excused ? (
        <p className="ms-teacher-start__error" role="alert">
          {errors.excused}
        </p>
      ) : null}

      {assignment.due_at && base ? (
        <DueDatePicker
          id={`${uid}-extension`}
          label="Their own deadline"
          value={extension}
          onChange={setExtension}
          chips={{ base }}
          clearLabel="No extension"
          min={assignment.due_at}
          hint="Later than the set’s due date. Work already handed in before it stops counting as late."
          error={errors.extended_due_at}
        />
      ) : (
        <p className="ms-set-composer__hint m-0">This set has no due date, so there is nothing to extend.</p>
      )}

      <div className="ms-set-composer__field m-0">
        <label htmlFor={`${uid}-note`} className="ms-set-composer__label">
          Note to {row.name} <span className="font-normal text-[var(--ec-text-secondary)]">(optional)</span>
        </label>
        <textarea
          id={`${uid}-note`}
          className="ec-input w-full resize-y"
          rows={3}
          maxLength={FEEDBACK_MAX}
          value={note}
          aria-describedby={`${uid}-note-hint`}
          aria-invalid={errors.feedback ? true : undefined}
          onChange={(e) => setNote(e.target.value)}
        />
        <p id={`${uid}-note-hint`} className="ms-set-composer__hint m-0">
          Shown to them on this set. Plain text.
        </p>
        {errors.feedback ? (
          <p className="ms-teacher-start__error" role="alert">
            {errors.feedback}
          </p>
        ) : null}
      </div>

      {errors.body ? <FormErrorAlert message={errors.body} /> : null}

      <div className="ms-teacher-confirm__actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center"
        >
          Cancel
        </button>
        <Button type="submit" loading={saving} loadingText="Saving…" disabled={!dirty}>
          Save
        </Button>
      </div>
    </form>
  )
}

/**
 * Students who are late or still owe work on a set, with Excuse / Extend
 * (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/[aid]`: "LateList with
 * Excuse/Extend Sheet"). Grouped by what the teacher is likely to do
 * (late-groups.ts): past the deadline, handed in late, still to hand in,
 * excused. Each row opens a Sheet that excuses, sets the student's own
 * deadline, or leaves them a note — `PATCH T/assignments/[aid]/students/[sid]`
 * — then refreshes the page so the matrix and this list agree.
 *
 * Groups are computed at the page's `now`, so the server render and the
 * hydrated list are the same.
 */
export function LateList({
  classroomId,
  assignment,
  students,
  now,
  timeZone,
  readOnly = false,
}: {
  classroomId: string
  assignment: { id: string; title: string; due_at: string | null }
  students: readonly StudentAssignmentState[]
  /** ISO instant the page was computed at. */
  now: string
  timeZone?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const titleId = useId()
  const [editing, setEditing] = useState<LateRow | null>(null)
  const [announce, setAnnounce] = useState('')
  const groups = lateGroups(students, assignment.due_at, new Date(now))
  const any = LATE_GROUP_ORDER.some((g) => groups[g].length > 0)

  return (
    <section aria-labelledby="late-list-title" className="ms-teacher-roster">
      <h2 id="late-list-title" className="ms-class-due__title">
        Late and missing
      </h2>
      <p className="ms-class-due__sub mb-4">
        {readOnly
          ? 'Who was late or missing when the class was archived.'
          : 'Excuse a student or give them longer. An extension also clears the late mark on work already in.'}
      </p>

      {!any ? (
        <p className="ms-students-watch__empty">Everyone still in the class has handed everything in on time.</p>
      ) : (
        LATE_GROUP_ORDER.map((g) =>
          groups[g].length === 0 ? null : (
            <div key={g} className="mb-5 last:mb-0">
              <h3 className="ms-teacher-section-title">
                {LATE_GROUP_TITLE[g]} ({groups[g].length})
              </h3>
              <ul className="ms-teacher-roster__list">
                {groups[g].map((row) => (
                  <li key={row.student_id} className="ms-teacher-roster__row">
                    <span className="ms-teacher-roster__who">
                      <span className="ms-teacher-roster__name">{row.name}</span>
                      <span className="ms-teacher-roster__meta">
                        {handedInPhrase(row)}
                        {row.deadline ? (
                          <>
                            {' · '}
                            {row.extended_due_at && Date.parse(row.extended_due_at) > Date.parse(assignment.due_at ?? '')
                              ? 'extended to '
                              : 'due '}
                            <LocalTime iso={row.deadline} timeZone={timeZone} now={now} />
                          </>
                        ) : null}
                        {row.feedback ? ' · has a note' : ''}
                      </span>
                    </span>
                    {!readOnly ? (
                      <span className="ms-teacher-roster__trail">
                        <button
                          type="button"
                          className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center text-sm"
                          onClick={() => {
                            setAnnounce('')
                            setEditing(row)
                          }}
                        >
                          Excuse or extend<span className="sr-only"> for {row.name}</span>
                        </button>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )
        )
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {!readOnly ? (
        <Sheet open={editing !== null} onClose={() => setEditing(null)} labelledById={titleId}>
          {editing ? (
            <FlagsForm
              key={editing.student_id}
              classroomId={classroomId}
              assignment={assignment}
              row={editing}
              titleId={titleId}
              onCancel={() => setEditing(null)}
              onDone={(message) => {
                setEditing(null)
                setAnnounce(message)
                router.refresh()
              }}
            />
          ) : null}
        </Sheet>
      ) : null}
    </section>
  )
}
