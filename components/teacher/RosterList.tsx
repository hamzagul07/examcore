'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TeacherConfirmDialog } from '@/components/teacher/ClassroomSettingsForm'
import { relativeDay } from '@/lib/teacher/insights/format'
import type { RosterStudent } from '@/lib/teacher/types'


function nameOf(s: Pick<RosterStudent, 'full_name'>): string {
  return s.full_name?.trim() || 'Unnamed student'
}

/**
 * The class list in settings: every member the class has had, active first,
 * with when they joined, when they last marked work in this class, their due
 * topics and overdue sets. Students who left or were removed stay listed with
 * a chip — the record of who was in the class — but their work is no longer
 * the teacher's to see, so they have no badges and no link.
 *
 * Remove asks first, says what removal does, and then flips the membership to
 * `removed` (DELETE …/students/[studentId]); the row updates in place.
 */
export function RosterList({
  classroomId,
  students,
  canRemove,
  nowMs,
}: {
  classroomId: string
  students: RosterStudent[]
  /** False for an archived class: its roster is a record, not a class. */
  canRemove: boolean
  /**
   * The instant the page was computed. "today" / "5 days ago" are counted in
   * calendar days from it (lib/teacher/insights/format.relativeDay, as on the
   * Students tab), and server and client use the same one.
   */
  nowMs: number
}) {
  const router = useRouter()
  const [rows, setRows] = useState(students)
  // A refresh (after a removal, or elsewhere on the page) brings the server's list.
  useEffect(() => setRows(students), [students])
  const [removing, setRemoving] = useState<RosterStudent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announce, setAnnounce] = useState('')

  async function remove() {
    if (!removing || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/teacher/classroom/${classroomId}/students/${removing.id}`, { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Could not remove the student. Try again.')
        return
      }
      setRows((list) =>
        list.map((s) => (s.id === removing.id ? { ...s, status: 'removed', due_count: 0, open_late: 0, last_attempt_at: null } : s))
      )
      setAnnounce(`${nameOf(removing)} was removed from the class.`)
      setRemoving(null)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const active = rows.filter((s) => s.status === 'active').length

  if (!rows.length) {
    return (
      <div className="ms-teacher-empty">
        <span className="ms-teacher-empty__icon" aria-hidden>
          0
        </span>
        <p className="ms-teacher-empty__title">Nobody has joined yet</p>
        <p className="ms-teacher-empty__body">
          Read the invite code out, or share the link — students appear here the moment they join.
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <p className="mb-3 text-sm text-[var(--ec-text-secondary)]">
        {active} active {active === 1 ? 'student' : 'students'}
        {rows.length > active ? ` · ${rows.length - active} no longer in the class` : ''}
      </p>
      <ul className="ms-teacher-roster__list">
        {rows.map((s) => {
          const isActive = s.status === 'active'
          const joined = relativeDay(s.joined_at, nowMs)
          const last = relativeDay(s.last_attempt_at, nowMs)
          const name = nameOf(s)
          return (
            <li key={s.id} className={`ms-teacher-roster__row${isActive ? '' : ' ms-teacher-roster__row--inactive'}`}>
              <div className="ms-teacher-roster__who">
                {isActive ? (
                  <Link
                    href={`/teacher/classroom/${classroomId}/students/${s.id}`}
                    className="ms-teacher-roster__name hover:underline"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="ms-teacher-roster__name">{name}</span>
                )}
                <span className="ms-teacher-roster__meta">
                  {isActive
                    ? [joined ? `joined ${joined}` : null, last ? `last marked ${last}` : 'no work in this class yet']
                        .filter(Boolean)
                        .join(' · ')
                    : s.status === 'left'
                      ? 'Left the class'
                      : 'Removed from the class'}
                </span>
              </div>
              <span className="ms-teacher-roster__trail">
                {!isActive ? (
                  <span className="ms-teacher-chip ms-teacher-chip--left">{s.status === 'left' ? 'Left' : 'Removed'}</span>
                ) : (
                  <>
                    {s.open_late > 0 ? (
                      <span className="ms-teacher-chip ms-teacher-chip--due">
                        {s.open_late} overdue
                      </span>
                    ) : null}
                    {s.due_count > 0 ? (
                      <span className="ms-roster-due" title="Topics due for review">
                        {s.due_count} due
                      </span>
                    ) : null}
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => {
                          setError('')
                          setRemoving(s)
                        }}
                        className="ms-teacher-danger__btn"
                        aria-label={`Remove ${name} from the class`}
                      >
                        Remove
                      </button>
                    ) : null}
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <TeacherConfirmDialog
        open={removing !== null}
        onClose={() => (busy ? undefined : setRemoving(null))}
        title={removing ? `Remove ${nameOf(removing)}?` : 'Remove student?'}
        confirmLabel="Remove from class"
        busyLabel="Removing…"
        busy={busy}
        error={error}
        onConfirm={() => void remove()}
      >
        <p className="ms-teacher-confirm__body">
          They leave the class straight away: you stop seeing their work, they stop seeing its sets, and
          they&apos;re told they were removed. They can&apos;t rejoin with the class code. Their own marked
          work stays in their account.
        </p>
      </TeacherConfirmDialog>
    </>
  )
}
