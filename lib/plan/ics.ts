/**
 * The plan as an iCalendar file — one all-day event per plan day, plus the
 * exam — so it can live in the calendar the student already checks.
 *
 * Pure. RFC 5545: CRLF line endings, lines folded at 75 octets, text
 * escaped, dates as VALUE=DATE with an exclusive DTEND. UIDs are stable
 * per plan generation and day, so re-importing the same file updates rather
 * than duplicates.
 */

import { formatMinutes, workBlocks, type HydratedPlan } from '@/lib/plan/plan-view'

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** RFC 5545 §3.1: fold at 75 octets with CRLF + single space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const out: string[] = []
  let start = 0
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length)
    // Never split a multi-byte character.
    while (end < bytes.length && end > start && (bytes[end]! & 0xc0) === 0x80) end -= 1
    out.push((start === 0 ? '' : ' ') + bytes.subarray(start, end).toString('utf8'))
    start = end
  }
  return out.join('\r\n')
}

function dateValue(iso: string): string {
  return iso.replace(/-/g, '')
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function stamp(isoTimestamp: string): string {
  return isoTimestamp.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function renderPlanIcs(plan: HydratedPlan, opts: { siteUrl: string; planUrl: string }): string {
  const gen = stamp(plan.generatedAt || new Date().toISOString())
  const uidBase = `plan-${(plan.generatedAt || '').replace(/[^0-9]/g, '')}`
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MarkScheme//Study plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Study plan',
  ]

  const examLabels = (date: string) =>
    plan.subjects
      .filter((s) => s.examDate === date)
      .map((s) => s.label)
      .join(', ')

  for (const day of plan.days) {
    const blocks = workBlocks(day)
    const summary =
      day.kind === 'exam'
        ? `Exam day — ${examLabels(day.date) || 'exam'}`
        : day.kind === 'rest'
          ? 'Rest day'
          : `Day ${day.day} · ${day.kind === 'review' ? 'Review' : formatMinutes(day.workMinutes)} · ${day.daysLeft} ${day.daysLeft === 1 ? 'day' : 'days'} to go`
    const description = [
      day.focus,
      ...blocks.map((b) => `• ${b.minutes} min — ${b.label}${b.href ? ` ${opts.siteUrl}${b.href}` : ''}`),
      '',
      `Open the plan: ${opts.planUrl}`,
    ].join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uidBase}-day-${day.day}@markscheme.app`,
      `DTSTAMP:${gen}`,
      `DTSTART;VALUE=DATE:${dateValue(day.date)}`,
      `DTEND;VALUE=DATE:${dateValue(nextDay(day.date))}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `URL:${opts.planUrl}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    )
  }

  lines.push(
    'BEGIN:VEVENT',
    `UID:${uidBase}-exam@markscheme.app`,
    `DTSTAMP:${gen}`,
    `DTSTART;VALUE=DATE:${dateValue(plan.examDate)}`,
    `DTEND;VALUE=DATE:${dateValue(nextDay(plan.examDate))}`,
    `SUMMARY:${escapeText(`Exam day — ${examLabels(plan.examDate) || plan.subjects.map((s) => s.label).join(', ')}`)}`,
    `DESCRIPTION:${escapeText('Sleep the night before. The plan stopped on purpose.')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  )

  return lines.map(fold).join('\r\n') + '\r\n'
}
