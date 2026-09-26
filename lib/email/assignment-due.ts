import 'server-only'

import {
  formatDueDayUtc,
  formatDueUtc,
  greetingName,
  itemNoun,
  oneLine,
  studentAssignmentUrl,
} from '@/lib/email/assignment-set'
import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_SERIF,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  statCell,
} from '@/lib/email/templates'
import { displayName } from '@/lib/teacher/display-name'
import type { AssignmentKind } from '@/lib/teacher/types'

/**
 * "Your set is due soon" / "Your teacher sent a reminder".
 *
 * Two senders share it (lib/teacher/reminders.ts):
 *
 *   - `due_soon`  the assignment-reminders cron, once per student per
 *                 deadline, in the 24 hours before it — and only while work
 *                 is still missing.
 *   - `teacher`   the teacher pressed Remind on the set.
 *
 * It names the student's own deadline (their extension, if they have one)
 * and how much is left, because "you have 2 of 3 questions to go, due in 5
 * hours" is something to act on and "reminder: set due" is not.
 */

export type AssignmentDueReason = 'due_soon' | 'teacher'

const HOUR_MS = 3_600_000

/**
 * The deadline relative to `now`, for a subject line or a notification:
 * "in under an hour", "in 5 hours", "in 2 days", "now overdue".
 * Hours are rounded down so "in 5 hours" is never an overstatement.
 */
export function relativeDue(deadline: string | null | undefined, now: Date = new Date()): string | null {
  if (!deadline) return null
  const ms = Date.parse(deadline)
  if (!Number.isFinite(ms)) return null
  const diff = ms - now.getTime()
  if (diff <= 0) return 'now overdue'
  if (diff < HOUR_MS) return 'in under an hour'
  const hours = Math.floor(diff / HOUR_MS)
  if (hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `in ${days} days`
}

export type AssignmentDueEmailPayload = {
  to: string
  /** Raw `full_name`s; displayName() is applied here. */
  recipientName: string | null
  teacherName: string | null
  className: string
  assignmentId: string
  title: string
  kind: AssignmentKind
  /** The deadline THIS student is held to (the later of due_at and their extension). */
  deadline: string | null
  itemsLeft: number
  itemsTotal: number
  reason: AssignmentDueReason
  unsubscribeHref: string
  /** Injectable for tests. */
  now?: Date
}

function workLeft(kind: AssignmentKind, left: number, total: number): string {
  if (total <= 1) return 'it is still to hand in'
  if (left >= total) return `all ${total} ${itemNoun(kind, total)} are still to hand in`
  return `${left} of ${total} ${itemNoun(kind, total)} ${left === 1 ? 'is' : 'are'} still to hand in`
}

export function buildAssignmentDueEmail(payload: AssignmentDueEmailPayload): {
  subject: string
  preheader: string
  html: string
  text: string
} {
  const now = payload.now ?? new Date()
  const greeting = greetingName(payload.recipientName)
  const teacher = displayName(payload.teacherName, 'Your teacher')
  const className = oneLine(payload.className, 80) || 'your class'
  const title = oneLine(payload.title, 120) || 'your set'
  const due = formatDueUtc(payload.deadline, now)
  const dueDay = formatDueDayUtc(payload.deadline)
  const relative = relativeDue(payload.deadline, now)
  const overdue = relative === 'now overdue'
  const total = Math.max(0, Math.floor(payload.itemsTotal))
  const left = Math.min(total, Math.max(0, Math.floor(payload.itemsLeft)))
  const href = studentAssignmentUrl(payload.assignmentId)

  const lead =
    payload.reason === 'teacher'
      ? `${teacher} sent a reminder about ${title} for ${className}`
      : `${title} for ${className} is due ${relative ?? 'soon'}`
  const deadlineLine = due
    ? overdue
      ? `It was due ${due}, and ${workLeft(payload.kind, left, total)}.`
      : `It is due ${due}, and ${workLeft(payload.kind, left, total)}.`
    : `There is no deadline, but ${workLeft(payload.kind, left, total)}.`

  const subject =
    payload.reason === 'teacher'
      ? `Reminder from ${teacher}: ${title}`
      : overdue
        ? `Overdue: ${title}`
        : `Due ${relative ?? (dueDay ? `on ${dueDay}` : 'soon')}: ${title}`

  const para = (inner: string) =>
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${inner}</p>`

  const stats =
    total > 1
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>` +
        statCell(`${left}`, `${itemNoun(payload.kind, left)} left`, EMAIL_BRAND) +
        statCell(`${total - left}`, 'handed in') +
        statCell(esc(dueDay ?? '—'), overdue ? 'was due' : 'due', overdue ? EMAIL_BRAND : EMAIL_INK) +
        `</tr></table>`
      : ''

  const bodyHtml =
    para(`Hi ${esc(greeting)},`) +
    para(`${esc(lead)}.`) +
    stats +
    para(esc(deadlineLine)) +
    para(
      overdue
        ? 'Late work still counts — hand it in from the set and your teacher sees it straight away.'
        : `Open the set and mark what is left; each ${itemNoun(payload.kind, 1)} is handed in as soon as it is marked.`
    )

  const text = [
    `Hi ${greeting},`,
    '',
    `${lead}.`,
    deadlineLine,
    '',
    overdue
      ? 'Late work still counts — hand it in from the set and your teacher sees it straight away.'
      : `Open the set and mark what is left; each ${itemNoun(payload.kind, 1)} is handed in as soon as it is marked.`,
    '',
    `Open the set: ${href}`,
    '',
    `Stop emails about work your teacher sets: ${payload.unsubscribeHref}`,
  ].join('\n')

  const preheader = oneLine(deadlineLine, 140)

  return {
    subject: oneLine(subject, 150),
    preheader,
    text,
    html: renderBrandedEmailHtml({
      kicker: payload.reason === 'teacher' ? 'A reminder from your teacher' : 'Due soon',
      preheader,
      bodyHtml,
      cta: { label: overdue ? 'Hand it in →' : 'Finish the set →', href },
      unsubscribe: { label: 'Stop emails about work your teacher sets', href: payload.unsubscribeHref },
    }),
  }
}

/** Fire-and-forget. Never throws — a failed email must not fail a reminder. */
export function sendAssignmentDueEmail(payload: AssignmentDueEmailPayload): void {
  try {
    const { subject, preheader, html, text } = buildAssignmentDueEmail(payload)
    sendEmailAsync({
      to: payload.to,
      subject,
      preheader,
      html,
      text,
      unsubscribeHref: payload.unsubscribeHref,
    })
  } catch (err) {
    console.warn('[assignment-due] email build failed', err instanceof Error ? err.message : err)
  }
}
