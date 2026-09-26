/**
 * A teacher's written note to a student on one marked script
 * (`teacher_feedback`, docs/TEACHER_SYSTEM_SPEC.md §1.3, §3, §5).
 *
 * Request parsing for `POST/DELETE /api/teacher/attempt/[id]/feedback`, and
 * the small display rules the composer and the student's view share. The
 * body is plain text: every real HTML tag, event handler, dangerous URL
 * scheme and control/bidi character is removed before it is stored
 * (teacherText — the same rule as a set's instructions and a per-student
 * note), because it is shown to the student, emailed to them and quoted in
 * their notification. It is rendered as text, never as HTML.
 *
 * Notes are never edited in place — no client role holds UPDATE on the table
 * (20260926c) — so an edit is a new note followed by deleting the old one.
 *
 * Pure: no I/O. Safe in client components.
 */

import { isUuid, teacherText } from '@/lib/teacher/assignments/validate'
import type { TeacherFeedback } from '@/lib/teacher/types'

/** teacher_feedback.body CHECK (length between 1 and 2000). */
export const FEEDBACK_BODY_MAX = 2000

export type FeedbackFieldError = { ok: false; error: string; field: string }

export type FeedbackPost = { body: string; classroom_id: string | null }

/** What the composer lists: a teacher's own notes on one script. */
export type FeedbackNote = Pick<TeacherFeedback, 'id' | 'body' | 'created_at' | 'read_at'>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The body as it will be stored: plain text, line breaks kept (at most one blank line). */
export function cleanFeedbackBody(raw: string): string {
  return teacherText(raw, { multiline: true }) ?? ''
}

/** `{body, classroom_id?}` → the note to store, or the first problem. */
export function parseFeedbackPost(input: unknown): { ok: true; value: FeedbackPost } | FeedbackFieldError {
  if (!isPlainObject(input)) return { ok: false, error: 'Send the note as a JSON object.', field: 'body' }
  if (typeof input.body !== 'string') return { ok: false, error: 'Write a note first.', field: 'body' }
  const body = cleanFeedbackBody(input.body)
  if (!body) return { ok: false, error: 'Write a note first.', field: 'body' }
  if (body.length > FEEDBACK_BODY_MAX) {
    return {
      ok: false,
      error: `That note is too long — keep it to ${FEEDBACK_BODY_MAX.toLocaleString('en-GB')} characters.`,
      field: 'body',
    }
  }
  const rawClass = input.classroom_id
  if (rawClass !== undefined && rawClass !== null && !isUuid(rawClass)) {
    return { ok: false, error: 'That class id is not valid.', field: 'classroom_id' }
  }
  return { ok: true, value: { body, classroom_id: isUuid(rawClass) ? rawClass.toLowerCase() : null } }
}

/** `{id}` → the note to delete, or the problem. */
export function parseFeedbackDelete(input: unknown): { ok: true; value: { id: string } } | FeedbackFieldError {
  if (!isPlainObject(input) || !isUuid(input.id)) {
    return { ok: false, error: 'Say which note to delete.', field: 'id' }
  }
  return { ok: true, value: { id: input.id.toLowerCase() } }
}

/**
 * The window in which a note's `teacher_feedback` notification is written
 * (lib/teacher/notify.ts onFeedbackSaved runs straight after the insert).
 * Deleting a note retracts only a notification written inside it, so an
 * unrelated later notification with the same text is never touched.
 */
export const FEEDBACK_NOTIFICATION_WINDOW_MS = 60 * 60_000

/** Newest first, ties by id, so a list renders the same on every load. */
export function sortFeedbackNotes<T extends Pick<FeedbackNote, 'id' | 'created_at'>>(notes: readonly T[]): T[] {
  return [...notes].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id)
  )
}

/** Characters left, as the composer counts them (after cleaning, as the server will). */
export function feedbackCharsLeft(raw: string): number {
  return FEEDBACK_BODY_MAX - cleanFeedbackBody(raw).length
}

/** One sentence for a note that was not sent or not deleted. */
export function describeFeedbackFailure(
  status: number,
  data: { error?: unknown } | null | undefined,
  action: 'send' | 'delete' = 'send'
): string {
  const lead = action === 'send' ? 'Not sent' : 'Not deleted'
  const raw = typeof data?.error === 'string' ? data.error.trim().replace(/[.\s]+$/, '') : ''
  const message = raw ? raw.charAt(0).toLowerCase() + raw.slice(1) : null
  if (status === 400) return `${lead} — ${message ?? 'check the note and try again'}.`
  if (status === 401) return `${lead} — your session has expired. Sign in again, then retry.`
  if (status === 403) return `${lead} — only a teacher account can write notes to students.`
  if (status === 404) {
    return action === 'delete' && message === 'note not found'
      ? `${lead} — that note was already removed.`
      : `${lead} — this script is no longer on your desk (the student may have left the class).`
  }
  if (status === 413) return `${lead} — that note is too long to send.`
  return `${lead} — ${message ?? 'something went wrong on our side'}. Try again.`
}
