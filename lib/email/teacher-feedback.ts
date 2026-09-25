import 'server-only'

import { excerpt, greetingName, oneLine } from '@/lib/email/assignment-set'
import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  escapeHtml as esc,
  quoteHtml,
  renderBrandedEmailHtml,
  statCell,
} from '@/lib/email/templates'
import { displayName } from '@/lib/teacher/display-name'
import { SITE_URL } from '@/lib/site-config'

/**
 * "Your teacher looked at your work" — one email for three events
 * (lib/teacher/notify.ts):
 *
 *   - `confirmed`   the teacher confirmed the AI mark (decision 'confirm');
 *   - `overridden`  the teacher re-marked it (decision 'override');
 *   - `feedback`    the teacher wrote a note on the attempt.
 *
 * Sent only for decisions the teacher left visible to the student
 * (`student_visible`), to students with `email_assignments` on. The teacher's
 * note is quoted as an excerpt — it is the reason the email exists — but it is
 * the teacher's plain text (HTML stripped on write) and is escaped again here.
 * The marking detail and any mark scheme text stay behind sign-in.
 */

export type TeacherFeedbackKind = 'confirmed' | 'overridden' | 'feedback'

export type TeacherFeedbackEmailPayload = {
  to: string
  /** Raw `full_name`s; displayName() is applied here. */
  recipientName: string | null
  teacherName: string | null
  kind: TeacherFeedbackKind
  attemptId: string
  /** What was marked — a set title or "9709/12 Q3"; null reads as "your answer". */
  workLabel: string | null
  /** Marks before this decision, when reliably known (never guessed). */
  marksBefore: number | null
  /** Marks now. */
  marksAfter: number | null
  totalMarks: number | null
  /** The teacher's note: the decision's reasoning note, or the feedback body. */
  note: string | null
  unsubscribeHref: string
}

const NOTE_EXCERPT_CHARS = 600

function fmtMarks(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) return null
  // Marks are whole numbers in practice; a half mark must not render as 6.5000001.
  return String(Math.round(n * 10) / 10)
}

export function attemptUrl(attemptId: string): string {
  return `${SITE_URL}/dashboard/attempt/${encodeURIComponent(attemptId)}`
}

/** "6 → 7/9", "7/9", or null when there is nothing numeric to say. */
export function markChangeText(
  before: number | null,
  after: number | null,
  total: number | null
): string | null {
  const a = fmtMarks(after)
  if (a === null) return null
  const t = fmtMarks(total)
  const out = t !== null && total !== null && total > 0 ? `${a}/${t}` : a
  const b = fmtMarks(before)
  return b !== null && b !== a ? `${b} → ${out}` : out
}

export function buildTeacherFeedbackEmail(payload: TeacherFeedbackEmailPayload): {
  subject: string
  preheader: string
  html: string
  text: string
} {
  const greeting = greetingName(payload.recipientName)
  const teacher = displayName(payload.teacherName, 'Your teacher')
  const work = oneLine(payload.workLabel, 80) || 'your answer'
  const change = markChangeText(payload.marksBefore, payload.marksAfter, payload.totalMarks)
  const markNow = markChangeText(null, payload.marksAfter, payload.totalMarks)
  const note = excerpt(payload.note, NOTE_EXCERPT_CHARS)
  const href = attemptUrl(payload.attemptId)

  let subject: string
  let lead: string
  let kicker: string
  if (payload.kind === 'overridden') {
    kicker = 'Re-marked by your teacher'
    subject = change ? `${teacher} re-marked ${work}: ${change}` : `${teacher} re-marked ${work}`
    lead = markNow
      ? `${teacher} has re-marked ${work}. Your mark is now ${markNow}.`
      : `${teacher} has re-marked ${work}.`
  } else if (payload.kind === 'confirmed') {
    kicker = 'Checked by your teacher'
    subject = markNow
      ? `${teacher} checked your mark on ${work}: ${markNow}`
      : `${teacher} checked your mark on ${work}`
    lead = markNow
      ? `${teacher} has checked the marking on ${work}, and your ${markNow} stands.`
      : `${teacher} has checked the marking on ${work}, and it stands.`
  } else {
    kicker = 'Feedback from your teacher'
    subject = `${teacher} left you feedback on ${work}`
    lead = `${teacher} has left you a note on ${work}.`
  }

  const para = (inner: string) =>
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${inner}</p>`

  const before = fmtMarks(payload.marksBefore)
  const after = fmtMarks(payload.marksAfter)
  const total = fmtMarks(payload.totalMarks)
  const showChange = payload.kind === 'overridden' && before !== null && after !== null && before !== after
  const stats = showChange
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>` +
      statCell(esc(before as string), 'marked before', EMAIL_MUTED) +
      statCell(esc(after as string), 'marked now', EMAIL_BRAND) +
      statCell(esc(total ?? '—'), 'marks available', EMAIL_INK) +
      `</tr></table>`
    : ''

  const noteHtml = note.text
    ? `<div style="font-family:${EMAIL_SANS};font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:${EMAIL_MUTED};margin:0 0 8px">${esc(
        teacher
      )} wrote</div>` +
      quoteHtml(note.text) +
      (note.truncated
        ? `<p style="margin:-12px 0 22px;font-family:${EMAIL_SANS};font-size:12.5px;color:${EMAIL_MUTED}">The full note is with your marked answer.</p>`
        : '')
    : ''

  const closing =
    payload.kind === 'feedback'
      ? 'It sits beside your marked answer, so you can read it against each mark.'
      : 'Your marked answer shows every mark as it now stands.'

  const bodyHtml = para(`Hi ${esc(greeting)},`) + para(esc(lead)) + stats + noteHtml + para(esc(closing))

  const text = [
    `Hi ${greeting},`,
    '',
    lead,
    ...(showChange ? [`Marked before: ${before}. Marked now: ${after}${total ? ` of ${total}` : ''}.`] : []),
    ...(note.text ? ['', `${teacher} wrote:`, note.text] : []),
    '',
    closing,
    '',
    `See your marked answer: ${href}`,
    '',
    `Stop emails about work your teacher sets: ${payload.unsubscribeHref}`,
  ].join('\n')

  const preheader = oneLine(note.text || lead, 140)

  return {
    subject: oneLine(subject, 150),
    preheader,
    text,
    html: renderBrandedEmailHtml({
      kicker,
      preheader,
      bodyHtml,
      cta: { label: 'See your marked answer →', href },
      unsubscribe: { label: 'Stop emails about work your teacher sets', href: payload.unsubscribeHref },
    }),
  }
}

/** Fire-and-forget. Never throws — a failed email must not fail a review. */
export function sendTeacherFeedbackEmail(payload: TeacherFeedbackEmailPayload): void {
  try {
    const { subject, preheader, html, text } = buildTeacherFeedbackEmail(payload)
    sendEmailAsync({
      to: payload.to,
      subject,
      preheader,
      html,
      text,
      unsubscribeHref: payload.unsubscribeHref,
    })
  } catch (err) {
    console.warn('[teacher-feedback] email build failed', err instanceof Error ? err.message : err)
  }
}
