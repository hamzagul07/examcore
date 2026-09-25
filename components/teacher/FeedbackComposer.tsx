'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { TeacherConfirmDialog } from '@/components/teacher/ClassroomSettingsForm'
import {
  FEEDBACK_BODY_MAX,
  cleanFeedbackBody,
  describeFeedbackFailure,
  sortFeedbackNotes,
  type FeedbackNote,
} from '@/lib/teacher/feedback'

export type FeedbackComposerProps = {
  /** The script the note is about (teacher_feedback.attempt_id). */
  attemptId: string
  /** The class the note is written from; the route uses the script's class when omitted. */
  classroomId?: string | null
  /** "Amira" — for the labels. */
  studentFirstName: string
  /** The teacher's own notes on this script (any order; shown newest first). */
  notes: FeedbackNote[]
  /** Id of the heading that names this section, if the page renders one. */
  labelledBy?: string
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function shortDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? DATE_FORMAT.format(t) : ''
}

/**
 * A written note from the teacher to the student on one script (spec §4:
 * FeedbackComposer, Caveat preview). The notes already sent are listed as
 * `.ms-feedback-note` slips — the handwriting the student will see — with
 * whether they have been read; the composer previews the new note the same
 * way as it is typed.
 *
 * Notes are never edited in place (no client UPDATE on teacher_feedback):
 * "Edit" loads a note into the composer, and sending posts the new note and
 * then deletes the old one, so a failure never leaves the student with none.
 * Deleting asks first. Every failure is shown (FormErrorAlert) with what to
 * do; nothing is reported sent unless the server said so.
 */
export function FeedbackComposer({ attemptId, classroomId, studentFirstName, notes, labelledBy }: FeedbackComposerProps) {
  const router = useRouter()
  const id = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [body, setBody] = useState('')
  const [editing, setEditing] = useState<FeedbackNote | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [deleting, setDeleting] = useState<FeedbackNote | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const cleaned = cleanFeedbackBody(body)
  const tooLong = cleaned.length > FEEDBACK_BODY_MAX
  const sorted = sortFeedbackNotes(notes)

  async function deleteNote(note: FeedbackNote): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
      const res = await fetch(`/api/teacher/attempt/${attemptId}/feedback`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: note.id }),
      })
      if (res.ok) return { ok: true }
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      // Already gone is what the teacher wanted.
      if (res.status === 404 && data.error === 'Note not found') return { ok: true }
      return { ok: false, message: describeFeedbackFailure(res.status, data, 'delete') }
    } catch {
      return { ok: false, message: 'Not deleted — could not reach the server. Check your connection and try again.' }
    }
  }

  async function send() {
    if (sending) return
    if (!cleaned) {
      setError('Write a note first.')
      textareaRef.current?.focus()
      return
    }
    if (tooLong) {
      setError(`That note is too long — keep it to ${FEEDBACK_BODY_MAX.toLocaleString('en-GB')} characters.`)
      return
    }
    setSending(true)
    setError('')
    setStatus('Sending…')
    try {
      const res = await fetch(`/api/teacher/attempt/${attemptId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, ...(classroomId ? { classroom_id: classroomId } : {}) }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setStatus('')
        setError(describeFeedbackFailure(res.status, data, 'send'))
        return
      }
      const replaced = editing
      if (replaced) {
        const removed = await deleteNote(replaced)
        if (!removed.ok) {
          setBody('')
          setEditing(null)
          setStatus('')
          setError(`Your new note was sent, but the old one is still there. ${removed.message}`)
          router.refresh()
          return
        }
      }
      setBody('')
      setEditing(null)
      setStatus(replaced ? `Note updated for ${studentFirstName}.` : `Note sent to ${studentFirstName}.`)
      router.refresh()
    } catch {
      setStatus('')
      setError('Not sent — could not reach the server. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError('')
    const result = await deleteNote(deleting)
    setDeleteBusy(false)
    if (!result.ok) {
      setDeleteError(result.message)
      return
    }
    if (editing?.id === deleting.id) setEditing(null)
    setDeleting(null)
    setStatus('Note deleted.')
    router.refresh()
  }

  function startEdit(note: FeedbackNote) {
    setEditing(note)
    setBody(note.body)
    setError('')
    setStatus('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <div className="flex flex-col gap-4" role={labelledBy ? 'group' : undefined} aria-labelledby={labelledBy}>
      {sorted.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Notes you have sent">
          {sorted.map((n) => (
            <li key={n.id}>
              <div className="ms-feedback-note">
                <p className="ms-feedback-note__label">Your note</p>
                <p className="ms-feedback-note__body">{n.body}</p>
                <p className="ms-feedback-note__meta">
                  Sent {shortDate(n.created_at)} · {n.read_at ? `Read ${shortDate(n.read_at)}` : 'Not read yet'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(n)}
                    disabled={sending}
                    className="ec-btn-ghost inline-flex min-h-[44px] items-center px-3 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError('')
                      setDeleting(n)
                    }}
                    disabled={sending}
                    className="ec-btn-ghost inline-flex min-h-[44px] items-center px-3 text-sm"
                    aria-label={`Delete your note from ${shortDate(n.created_at)}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-2">
        {editing ? (
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-[var(--ec-text-secondary)]">
            Editing your note from {shortDate(editing.created_at)} — sending replaces it.
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setBody('')
              }}
              className="ec-btn-underline min-h-[44px] px-1"
            >
              Cancel edit
            </button>
          </p>
        ) : null}
        <label htmlFor={`${id}-body`} className="text-sm font-semibold text-[var(--ec-text-primary)]">
          {editing ? `Your note to ${studentFirstName}` : `Write a note to ${studentFirstName}`}
        </label>
        <textarea
          id={`${id}-body`}
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            if (error) setError('')
          }}
          rows={4}
          maxLength={FEEDBACK_BODY_MAX + 200}
          className="ec-input w-full resize-y"
          aria-invalid={Boolean(error) || tooLong || undefined}
          aria-describedby={`${id}-count ${id}-help`}
          placeholder="e.g. Lovely clear working. Next time, state the formula before you substitute."
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ec-text-faint)]">
          <span id={`${id}-help`}>
            {studentFirstName} is notified and sees it on this script. Plain text only.
          </span>
          <span id={`${id}-count`} className={tooLong ? 'font-semibold text-[var(--ec-ink-crimson)]' : undefined}>
            {cleaned.length.toLocaleString('en-GB')}/{FEEDBACK_BODY_MAX.toLocaleString('en-GB')}
          </span>
        </div>

        {cleaned ? (
          <div className="ms-feedback-note" aria-hidden>
            <p className="ms-feedback-note__label">Preview — what {studentFirstName} will see</p>
            <p className="ms-feedback-note__body">{cleaned}</p>
          </div>
        ) : null}

        {error ? <FormErrorAlert message={error} /> : null}
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void send()}
            loading={sending}
            loadingText="Sending…"
            disabled={sending || !cleaned || tooLong}
          >
            {editing ? 'Send updated note' : 'Send note'}
          </Button>
        </div>
      </div>

      <TeacherConfirmDialog
        open={deleting !== null}
        onClose={() => (deleteBusy ? undefined : setDeleting(null))}
        title="Delete this note?"
        confirmLabel="Delete note"
        busyLabel="Deleting…"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
      >
        <p className="ms-teacher-confirm__body">
          {studentFirstName} will no longer see it on this script, and its notification is withdrawn. An email that
          already went out can&apos;t be recalled.
        </p>
      </TeacherConfirmDialog>
    </div>
  )
}
