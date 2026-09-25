'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TeacherConfirmDialog } from '@/components/teacher/ClassroomSettingsForm'

/**
 * Remove one student from the class, from their roster row (spec §4
 * `.../students`: "Remove via desk-management's DELETE"). Asks first, says
 * what removal does, then calls DELETE …/students/[studentId] — which flips
 * the membership to `removed`, audits it and tells the student — and
 * refreshes the page so the row comes back from the server as Removed.
 *
 * Every failure is shown in the dialog with what to do; the outcome is
 * announced politely for screen readers.
 */
export function RemoveStudentButton({
  classroomId,
  studentId,
  name,
}: {
  classroomId: string
  studentId: string
  /** Full name, for the button's label and the dialog title. */
  name: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announce, setAnnounce] = useState('')

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(
        `/api/teacher/classroom/${encodeURIComponent(classroomId)}/students/${encodeURIComponent(studentId)}`,
        { method: 'DELETE' }
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(
          res.status === 404
            ? 'They are no longer in this class — reload the page to see the current list.'
            : data.error || 'Could not remove the student. Try again.'
        )
        return
      }
      setOpen(false)
      setAnnounce(`${name} was removed from the class.`)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
      <button
        type="button"
        onClick={() => {
          setError('')
          setOpen(true)
        }}
        className="ms-teacher-danger__btn"
        aria-label={`Remove ${name} from the class`}
      >
        Remove
      </button>
      <TeacherConfirmDialog
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        title={`Remove ${name}?`}
        confirmLabel="Remove from class"
        busyLabel="Removing…"
        busy={busy}
        error={error}
        onConfirm={() => void remove()}
      >
        <p className="ms-teacher-confirm__body">
          They leave the class straight away: you stop seeing their work, they stop seeing its sets, and they&apos;re
          told they were removed. They can&apos;t rejoin with the class code. Their own marked work stays in their
          account.
        </p>
      </TeacherConfirmDialog>
    </>
  )
}
