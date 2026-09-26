import 'server-only'

import { formatDueDayUtc, greetingName, oneLine } from '@/lib/email/assignment-set'
import {
  EMAIL_BODY,
  EMAIL_BRAND,
  EMAIL_HAIRLINE,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  calloutHtml,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  renderBrandedEmailHtml,
  sectionHeading,
  statCell,
} from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'
import type { DigestClass, DigestSet, TeacherDigest } from '@/lib/teacher/digest'

/**
 * The Sunday teacher digest email, sent (and awaited) by the digest cron.
 * The figures are computed in
 * lib/teacher/digest.ts (same rules as the class week page); this file only
 * lays them out: per class a three-figure stat row (handed in / late / class
 * mean), where the marks went, then one line per thing that needs the
 * teacher — each set, the review backlog, the students who have gone quiet —
 * each with a link straight to the page that deals with it.
 *
 * Student names arrive already passed through displayName() ("Amira K.");
 * class names and set titles are the teacher's own text and are escaped here.
 */

export type TeacherDigestEmailPayload = {
  /** The teacher's raw `full_name`; greetingName() derives the salutation via displayName(). */
  recipientName: string | null
  digest: TeacherDigest
  unsubscribeHref: string
}

const pct = (value: number | null): string => (value === null ? '—' : `${Math.round(value)}%`)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function teacherSetUrl(classId: string, setId: string): string {
  return `${SITE_URL}/teacher/classroom/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(setId)}`
}
export function teacherReviewsUrl(classId: string): string {
  return `${SITE_URL}/teacher/reviews?classroom_id=${encodeURIComponent(classId)}`
}
export function teacherStudentsUrl(classId: string): string {
  return `${SITE_URL}/teacher/classroom/${encodeURIComponent(classId)}/students`
}
export function teacherDeskUrl(): string {
  return `${SITE_URL}/teacher/dashboard`
}

/** "Amira K., Ben T. and 2 more" */
export function namesLine(names: readonly string[], total: number): string {
  const shown = names.slice(0, Math.max(0, total))
  const rest = Math.max(0, total - shown.length)
  if (shown.length === 0) return plural(total, 'student')
  if (rest === 0) {
    if (shown.length === 1) return shown[0]
    return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`
  }
  return `${shown.join(', ')} and ${rest} more`
}

/** "Due Fri 3 Oct · 18 of 24 in · 3 late · mean 64%" */
export function setMetaLine(set: DigestSet): string {
  const due = formatDueDayUtc(set.due_at)
  return [
    due ? `Due ${due}` : 'No deadline',
    set.expected > 0 ? `${set.handed_in} of ${set.expected} in` : 'nobody owes work',
    set.late > 0 ? `${set.late} late` : null,
    set.mean_pct !== null ? `mean ${pct(set.mean_pct)}` : null,
  ]
    .filter((p): p is string => Boolean(p))
    .join(' · ')
}

/**
 * The subject line leads with what needs doing, because that is what decides
 * whether it is opened on a Sunday: "3 scripts to review, 2 late".
 */
export function digestSubject(digest: TeacherDigest): string {
  const t = digest.totals
  const parts = [
    t.unreviewed > 0 ? plural(t.unreviewed, 'script') + ' to review' : null,
    t.late > 0 ? `${t.late} late` : null,
    t.silent > 0 ? `${t.silent} gone quiet` : null,
  ].filter((p): p is string => Boolean(p))
  return parts.length > 0
    ? `Your classes this week: ${parts.join(', ')}`
    : `Your classes this week (${digest.week_label})`
}

function classHtml(c: DigestClass): string {
  const name = oneLine(c.name, 80) || 'Class'
  const sub = `${c.subject_label} · ${plural(c.members, 'student')}`
  const parts: string[] = [sectionHeading(name, sub)]

  parts.push(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>` +
      statCell(c.expected > 0 ? `${c.handed_in}/${c.expected}` : '—', 'handed in') +
      statCell(String(c.late), 'late', c.late > 0 ? EMAIL_BRAND : EMAIL_INK) +
      statCell(pct(c.mean_pct), 'class mean') +
      `</tr></table>`
  )

  if (c.headline_gap) parts.push(calloutHtml(esc(c.headline_gap), 'Where marks went'))

  const rows: string[] = []
  for (const set of c.sets) {
    rows.push(
      linkRow({
        titleHtml: `<span style="font-family:${EMAIL_SERIF};font-size:15px;font-weight:600;color:${EMAIL_INK}">${esc(
          oneLine(set.title, 90)
        )}</span>`,
        metaHtml: esc(setMetaLine(set)),
        href: teacherSetUrl(c.id, set.id),
        actionLabel: 'Open →',
      })
    )
  }
  if (c.unreviewed > 0) {
    rows.push(
      linkRow({
        titleHtml: `<span style="font-family:${EMAIL_SERIF};font-size:15px;font-weight:600;color:${EMAIL_INK}">${esc(
          plural(c.unreviewed, 'script')
        )} waiting for review</span>`,
        metaHtml: 'Confirm, re-mark or flag — the student sees what you decide',
        href: teacherReviewsUrl(c.id),
        actionLabel: 'Review →',
      })
    )
  }
  if (c.silent_count > 0) {
    rows.push(
      linkRow({
        titleHtml: `<span style="font-family:${EMAIL_SERIF};font-size:15px;font-weight:600;color:${EMAIL_INK}">Gone quiet: ${esc(
          namesLine(c.silent, c.silent_count)
        )}</span>`,
        metaHtml: 'No marked work in this subject for two weeks or more',
        href: teacherStudentsUrl(c.id),
        actionLabel: 'See students →',
      })
    )
  }
  if (rows.length > 0) parts.push(linkRowTable(rows.join('')))
  if (c.more_sets > 0) {
    parts.push(
      `<p style="margin:10px 0 0;font-family:${EMAIL_SANS};font-size:12.5px;color:${EMAIL_MUTED}">+${plural(
        c.more_sets,
        'more set'
      )} this week on your desk.</p>`
    )
  }
  return `<div style="margin:0 0 34px">${parts.join('\n')}</div>`
}

function classText(c: DigestClass): string[] {
  const lines = [
    '',
    `${oneLine(c.name, 80) || 'Class'} (${c.subject_label}, ${plural(c.members, 'student')})`,
    `Handed in: ${c.expected > 0 ? `${c.handed_in}/${c.expected}` : '—'} · Late: ${c.late} · Class mean: ${pct(c.mean_pct)}`,
  ]
  if (c.headline_gap) lines.push(`Where marks went: ${c.headline_gap}`)
  for (const set of c.sets) {
    lines.push(`- ${oneLine(set.title, 90)} — ${setMetaLine(set)}: ${teacherSetUrl(c.id, set.id)}`)
  }
  if (c.more_sets > 0) lines.push(`- +${plural(c.more_sets, 'more set')} on your desk`)
  if (c.unreviewed > 0) {
    lines.push(`- ${plural(c.unreviewed, 'script')} waiting for review: ${teacherReviewsUrl(c.id)}`)
  }
  if (c.silent_count > 0) {
    lines.push(`- Gone quiet: ${namesLine(c.silent, c.silent_count)}: ${teacherStudentsUrl(c.id)}`)
  }
  return lines
}

export function buildTeacherDigestEmail(payload: TeacherDigestEmailPayload): {
  subject: string
  preheader: string
  html: string
  text: string
} {
  const { digest } = payload
  const greeting = greetingName(payload.recipientName)
  const classCount = digest.classes.length
  const intro = `Here is how ${
    classCount === 1 ? 'your class' : `your ${classCount} classes`
  } went this week (${digest.week_label}) — what came in, who is behind, and what to look at first.`

  const t = digest.totals
  const preheader =
    t.unreviewed > 0
      ? `${plural(t.unreviewed, 'script')} waiting for review, ${t.handed_in} of ${t.expected} hand-ins in.`
      : `${t.handed_in} of ${t.expected} hand-ins in across ${plural(classCount, 'class', 'classes')}.`

  const bodyHtml =
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">Hi ${esc(
      greeting
    )},</p>` +
    `<p style="margin:0 0 28px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${esc(
      intro
    )}</p>` +
    digest.classes.map(classHtml).join('\n') +
    `<div style="height:1px;background:${EMAIL_HAIRLINE};margin:0 0 18px;font-size:0;line-height:0">&nbsp;</div>` +
    `<p style="margin:0;font-family:${EMAIL_SANS};font-size:12.5px;line-height:1.6;color:${EMAIL_MUTED}">Figures are for ${esc(
      digest.week_label
    )} (UTC) and count current members only. Names are shortened for email.</p>`

  const text = [
    `Hi ${greeting},`,
    '',
    intro,
    ...digest.classes.flatMap(classText),
    '',
    `Open your desk: ${teacherDeskUrl()}`,
    '',
    `Figures are for ${digest.week_label} (UTC) and count current members only.`,
    '',
    `Stop the Sunday class digest: ${payload.unsubscribeHref}`,
  ].join('\n')

  return {
    subject: oneLine(digestSubject(digest), 150),
    preheader,
    text,
    html: renderBrandedEmailHtml({
      kicker: `Teacher digest · ${digest.week_label}`,
      preheader,
      bodyHtml,
      cta: { label: 'Open your desk →', href: teacherDeskUrl() },
      unsubscribe: { label: 'Stop the Sunday class digest', href: payload.unsubscribeHref },
    }),
  }
}
