import 'server-only'

import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  calloutHtml,
  escapeHtml as esc,
  quoteHtml,
  renderBrandedEmailHtml,
} from '@/lib/email/templates'
import { displayName } from '@/lib/teacher/display-name'
import type { AssignmentKind } from '@/lib/teacher/types'
import { SITE_URL } from '@/lib/site-config'

/**
 * "Your teacher set new work" — sent to each targeted student when a set is
 * published (lib/teacher/notify.ts notifyAssignmentPublished), to those with
 * `email_assignments` on and an address that has not bounced or complained.
 *
 * What goes in and what stays out:
 *
 *   - Names only through displayName() ("Sarah K."), the one formatter
 *     allowed into email (docs/TEACHER_SYSTEM_SPEC.md §8). The class name,
 *     set title and instructions are the teacher's own text for their own
 *     students, escaped here and trimmed to an excerpt.
 *   - No question text and no mark scheme: the set's page is the one place
 *     that renders them, behind sign-in.
 *   - The student is told plainly that marks on the set are visible to their
 *     teacher — the same notice the set's page carries — because an email is
 *     often the first they hear of it.
 *
 * Also home to the date and label helpers the other class emails share, so a
 * deadline reads the same way in every one of them.
 */

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  question_set: 'Questions',
  whole_paper: 'Whole paper',
  topic_drill: 'Topic drill',
  practice_prompt: 'Practice prompt',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Control characters never belong in a subject line or an excerpt; a raw
// newline in a header is how header injection starts.
const CONTROL_OR_SPACE_RUN = /[\u0000-\u001f\u007f\s]+/g
// Everything but tab and newline, which excerpts keep as layout.
const CONTROL_EXCEPT_LAYOUT = /[\u0000-\u0008\u000b-\u001f\u007f]/g

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * "Fri 3 Oct, 16:00 UTC" — the year is added only when it is not `now`'s.
 *
 * Always UTC, and always says so. The server does not know the student's
 * time zone, and a deadline shown in the wrong one without a label is worse
 * than one that names its zone: the student can convert a labelled time, but
 * cannot know an unlabelled one is off. Built by hand rather than with
 * Intl so the output is identical on every runtime's ICU build.
 */
export function formatDueUtc(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms)
  const year = d.getUTCFullYear() === now.getUTCFullYear() ? '' : ` ${d.getUTCFullYear()}`
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year}, ${pad2(
    d.getUTCHours()
  )}:${pad2(d.getUTCMinutes())} UTC`
}

/** "Fri 3 Oct" — for subject lines, where the time would crowd the title out. */
export function formatDueDayUtc(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/**
 * Plain, single-line, bounded: free text the teacher typed, made safe for a
 * subject line or a one-line excerpt. Control characters and runs of
 * whitespace (including newlines, which a mail header must never carry)
 * collapse to one space; anything past `max` characters is cut at a word
 * boundary where one is near and marked with an ellipsis.
 */
export function oneLine(text: string | null | undefined, max: number): string {
  const flat = (text ?? '').replace(CONTROL_OR_SPACE_RUN, ' ').trim()
  const chars = Array.from(flat)
  if (chars.length <= max) return flat
  const cut = chars.slice(0, Math.max(1, max - 1)).join('')
  const space = cut.lastIndexOf(' ')
  const head = space > max * 0.6 ? cut.slice(0, space) : cut
  return `${head.replace(/[\s,.;:–—-]+$/u, '')}…`
}

/**
 * Multi-line excerpt of a longer note (instructions, feedback): paragraphs
 * kept, blank-line runs collapsed, bounded to `max` characters with an
 * ellipsis. The full text lives on the page the email links to.
 */
export function excerpt(text: string | null | undefined, max: number): { text: string; truncated: boolean } {
  const cleaned = (text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_EXCEPT_LAYOUT, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const chars = Array.from(cleaned)
  if (chars.length <= max) return { text: cleaned, truncated: false }
  const cut = chars.slice(0, Math.max(1, max - 1)).join('')
  const space = cut.search(/\s\S*$/)
  const head = space > max * 0.6 ? cut.slice(0, space) : cut
  return { text: `${head.replace(/[\s,.;:–—-]+$/u, '')}…`, truncated: true }
}

/** "Amira" from "Amira Khan" — the greeting, derived from displayName so it is equally safe. */
export function greetingName(fullName: string | null | undefined): string {
  const shown = displayName(fullName ?? null, '')
  return shown.replace(/\s+\S+\.$/u, '') || 'there'
}

export function studentAssignmentUrl(assignmentId: string): string {
  return `${SITE_URL}/dashboard/assignments/${encodeURIComponent(assignmentId)}`
}

export type AssignmentSetEmailPayload = {
  to: string
  /** Raw `full_name`s; displayName() is applied here. */
  recipientName: string | null
  teacherName: string | null
  className: string
  assignmentId: string
  title: string
  kind: AssignmentKind
  itemCount: number
  dueAt: string | null
  isMock?: boolean
  timedMinutes?: number | null
  instructions?: string | null
  unsubscribeHref: string
  /** Injectable for tests. */
  now?: Date
}

const INSTRUCTIONS_EXCERPT_CHARS = 400

/** What one item of a set is called: question, paper or prompt. */
export function itemNoun(kind: AssignmentKind, count: number): string {
  const one = kind === 'whole_paper' ? 'paper' : kind === 'practice_prompt' ? 'prompt' : 'question'
  return count === 1 ? one : `${one}s`
}

function itemCountLabel(kind: AssignmentKind, n: number): string {
  return `${n} ${itemNoun(kind, n)}`
}

export function buildAssignmentSetEmail(payload: AssignmentSetEmailPayload): {
  subject: string
  preheader: string
  html: string
  text: string
} {
  const now = payload.now ?? new Date()
  const greeting = greetingName(payload.recipientName)
  const teacher = displayName(payload.teacherName, 'Your teacher')
  const className = oneLine(payload.className, 80) || 'your class'
  const title = oneLine(payload.title, 120) || 'New set'
  const due = formatDueUtc(payload.dueAt, now)
  const dueDay = formatDueDayUtc(payload.dueAt)
  const href = studentAssignmentUrl(payload.assignmentId)
  const count = Math.max(0, Math.floor(payload.itemCount))

  const meta = [
    ASSIGNMENT_KIND_LABEL[payload.kind] ?? 'Set',
    count > 0 ? itemCountLabel(payload.kind, count) : null,
    due ? `Due ${due}` : 'No deadline',
    payload.timedMinutes && payload.timedMinutes > 0 ? `Timed: ${Math.floor(payload.timedMinutes)} min` : null,
    payload.isMock ? 'Mock' : null,
  ].filter((part): part is string => Boolean(part))

  const instructions = excerpt(payload.instructions, INSTRUCTIONS_EXCERPT_CHARS)

  const para = (inner: string) =>
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${inner}</p>`

  const slip =
    `<div style="font-family:${EMAIL_SERIF};font-size:19px;font-weight:600;color:${EMAIL_INK};line-height:1.35;margin:0 0 8px">${esc(title)}</div>` +
    `<div style="font-family:${EMAIL_SANS};font-size:12px;letter-spacing:.02em;color:${EMAIL_MUTED}">${meta
      .map(esc)
      .join(' &middot; ')}</div>`

  const bodyHtml =
    para(`Hi ${esc(greeting)},`) +
    para(`${esc(teacher)} has set new work for <strong style="color:${EMAIL_INK}">${esc(className)}</strong>.`) +
    calloutHtml(slip, 'New set') +
    (instructions.text
      ? `<div style="font-family:${EMAIL_SANS};font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:${EMAIL_MUTED};margin:0 0 8px">From ${esc(
          teacher
        )}</div>` + quoteHtml(instructions.text)
      : '') +
    para(
      'Open the set and mark each piece from there — it is handed in the moment the marking finishes, so there is nothing else to send.'
    ) +
    `<p style="margin:0;font-family:${EMAIL_SANS};font-size:12.5px;line-height:1.6;color:${EMAIL_MUTED}">Marks on this set are visible to your teacher.</p>`

  const text = [
    `Hi ${greeting},`,
    '',
    `${teacher} has set new work for ${className}.`,
    '',
    title,
    meta.join(' · '),
    ...(instructions.text ? ['', `From ${teacher}:`, instructions.text] : []),
    '',
    'Open the set and mark each piece from there — it is handed in the moment the marking finishes, so there is nothing else to send.',
    '',
    `Open the set: ${href}`,
    '',
    'Marks on this set are visible to your teacher.',
    '',
    `Stop emails about work your teacher sets: ${payload.unsubscribeHref}`,
  ].join('\n')

  const preheader = due
    ? `${teacher} set ${title} for ${className}, due ${due}.`
    : `${teacher} set ${title} for ${className}.`

  return {
    subject: oneLine(dueDay ? `New set: ${title} (due ${dueDay})` : `New set: ${title}`, 150),
    preheader,
    text,
    html: renderBrandedEmailHtml({
      kicker: 'Set by your teacher',
      preheader,
      bodyHtml,
      cta: { label: 'Open the set →', href },
      unsubscribe: { label: 'Stop emails about work your teacher sets', href: payload.unsubscribeHref },
    }),
  }
}

/** Fire-and-forget. Never throws — a failed email must not fail a publish. */
export function sendAssignmentSetEmail(payload: AssignmentSetEmailPayload): void {
  try {
    const { subject, preheader, html, text } = buildAssignmentSetEmail(payload)
    sendEmailAsync({
      to: payload.to,
      subject,
      preheader,
      html,
      text,
      unsubscribeHref: payload.unsubscribeHref,
    })
  } catch (err) {
    console.warn('[assignment-set] email build failed', err instanceof Error ? err.message : err)
  }
}
