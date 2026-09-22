import 'server-only'

import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BORDER,
  EMAIL_BRAND as BRAND,
  EMAIL_INK as INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  EMAIL_SURFACE,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  statCell,
} from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'

/**
 * "Your mark is ready" — sent for every mark a signed-in student runs.
 *
 * Marking a handwritten script against a real scheme costs 2–6 minutes and no
 * amount of tuning takes that to zero. The run survives the tab closing, and
 * this mail is the copy of the score that survives everything else — so the
 * copy has to read just as well to someone who watched it land as to someone
 * who went to make tea.
 *
 * Deliberately carries the score and nothing else of substance. Two reasons:
 * the mark is the one fact worth an inbox interruption, and the marking detail
 * quotes published mark scheme text, which belongs behind the app rather than
 * copied into mail we cannot withdraw.
 */
export type MarkReadyPayload = {
  to: string
  recipientName?: string | null
  /** The durable result page — `/dashboard/attempt/[id]`. */
  attemptId: string
  marksEarned: number
  totalMarks: number
  /** e.g. "Business Studies" — omitted when we could not resolve one. */
  subjectLabel?: string | null
  /** e.g. "9708/22" — the paper this question came from, when known. */
  paperRef?: string | null
  /** What they predicted during the wait, when they answered the prompt. */
  predictedMarks?: number | null
  /** The examiner's weak-topic tags for this answer, e.g. "Analysis (AO3)". */
  weakTopics?: string[] | null
  /** The examiner's "what to study next" paragraph. Never scheme text. */
  whatToStudyNext?: string | null
  unsubscribeHref: string
}

const STUDY_NOTE_MAX = 320

/**
 * The study note is model prose about the student's own answer, which is
 * fine to mail — but it occasionally paraphrases the scheme it marked against,
 * and published scheme text must stay behind the app. Anything that names the
 * scheme or reads like an award code is dropped rather than risked. The rest
 * is cut to one inbox-sized paragraph, at a sentence end where possible.
 */
export function studyNoteForEmail(raw: string | null | undefined): string | null {
  const text = raw?.replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (/mark ?scheme|\b[BMA]\d\b|\bdep\b|\bcao\b|\boe\b/i.test(text)) return null
  if (text.length <= STUDY_NOTE_MAX) return text
  const head = text.slice(0, STUDY_NOTE_MAX)
  const sentenceEnd = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '))
  if (sentenceEnd > STUDY_NOTE_MAX * 0.5) return head.slice(0, sentenceEnd + 1)
  const wordEnd = head.lastIndexOf(' ')
  return `${head.slice(0, wordEnd > 0 ? wordEnd : STUDY_NOTE_MAX).trimEnd()}…`
}

/** Up to three short tags; anything long or scheme-shaped is not a tag. */
export function weakTopicsForEmail(raw: string[] | null | undefined): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const t = typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : ''
    if (!t || t.length > 48 || seen.has(t.toLowerCase())) continue
    if (/mark ?scheme|\b[BMA]\d\b/i.test(t)) continue
    seen.add(t.toLowerCase())
    out.push(t)
    if (out.length === 3) break
  }
  return out
}

/** Short, honest read on the score. Never congratulatory about a low mark. */
function verdictLine(pct: number): string {
  if (pct >= 85) return 'That is a strong answer — the detail below shows what held the last marks.'
  if (pct >= 60) return 'A solid answer with marks still on the table. The breakdown shows exactly which.'
  if (pct >= 35) return 'There are real marks to recover here, and the breakdown names each one.'
  return 'Worth reading the breakdown properly — most of these marks are recoverable once you see what the examiner wanted.'
}

export function buildMarkReadyEmail(payload: MarkReadyPayload): {
  subject: string
  html: string
  text: string
} {
  const {
    recipientName,
    attemptId,
    marksEarned,
    totalMarks,
    subjectLabel,
    paperRef,
    predictedMarks,
    unsubscribeHref,
  } = payload
  const weakTopics = weakTopicsForEmail(payload.weakTopics)
  const studyNote = studyNoteForEmail(payload.whatToStudyNext)

  const href = `${SITE_URL}/dashboard/attempt/${attemptId}`
  const greeting = recipientName?.trim() || 'there'
  const pct = totalMarks > 0 ? Math.round((marksEarned / totalMarks) * 100) : 0
  // What the mark was *of*, as specifically as the caller could tell us.
  const what = [subjectLabel?.trim(), paperRef?.trim()].filter(Boolean).join(' ') || 'your answer'

  // Only shown when they actually predicted. The gap is the point of the ask:
  // it is the difference between a score and a lesson about your own judgement.
  const gap =
    typeof predictedMarks === 'number' ? marksEarned - predictedMarks : null
  const predictionLine =
    gap == null
      ? ''
      : gap === 0
        ? `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:15px;line-height:1.65;color:${EMAIL_BODY}">You predicted ${predictedMarks}. You were exactly right — reading your own answer accurately is most of the skill.</p>`
        : gap < 0
          ? `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:15px;line-height:1.65;color:${EMAIL_BODY}">You predicted ${predictedMarks} and scored ${marksEarned}. Marking yourself ${Math.abs(gap)} ${Math.abs(gap) === 1 ? 'mark' : 'marks'} high is the habit that costs people grades in the real exam — the breakdown shows where the gap was.</p>`
          : `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:15px;line-height:1.65;color:${EMAIL_BODY}">You predicted ${predictedMarks} and scored ${marksEarned}. You are underrating your own work by ${gap} ${gap === 1 ? 'mark' : 'marks'}.</p>`

  const statsRow =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>` +
    statCell(`${marksEarned}/${totalMarks}`, 'marks awarded', BRAND) +
    statCell(`${pct}%`, 'of the marks available') +
    statCell(String(Math.max(0, totalMarks - marksEarned)), 'left on the table', INK) +
    `</tr></table>`

  const para = (inner: string) =>
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${inner}</p>`

  // The two things worth carrying out of the app: where the marks went, and
  // what to do about it. Both are the examiner's own words about this answer.
  const label = (inner: string) =>
    `<div style="font-family:${EMAIL_SANS};font-size:10px;color:${EMAIL_MUTED};text-transform:uppercase;letter-spacing:.12em;margin:0 0 8px">${inner}</div>`
  const topicsBlock = weakTopics.length
    ? `<div style="margin:0 0 18px">${label('Where the marks went')}${weakTopics
        .map(
          (t) =>
            `<span style="display:inline-block;padding:5px 11px;margin:0 6px 6px 0;border:1px solid ${EMAIL_BORDER};border-radius:999px;font-family:${EMAIL_SANS};font-size:12px;line-height:1.3;color:${INK}">${esc(t)}</span>`
        )
        .join('')}</div>`
    : ''
  const studyBlock = studyNote
    ? `<div style="margin:0 0 22px;padding:14px 16px;border-left:3px solid ${BRAND};background:${EMAIL_SURFACE}">${label('What to do next')}<div style="font-family:${EMAIL_SERIF};font-size:15px;line-height:1.6;color:${EMAIL_BODY}">${esc(studyNote)}</div></div>`
    : ''

  const bodyHtml =
    para(`Hi ${esc(greeting)},`) +
    para(
      `Marking for ${esc(what)} is finished — here is your score, with every mark broken down on your result page.`
    ) +
    statsRow +
    predictionLine +
    topicsBlock +
    studyBlock +
    para(verdictLine(pct))

  const text = [
    `Hi ${greeting},`,
    '',
    `Marking for ${what} is finished — here is your score, with every mark broken down on your result page.`,
    '',
    `Marks awarded: ${marksEarned}/${totalMarks} (${pct}%)`,
    gap == null
      ? ''
      : gap === 0
        ? `You predicted ${predictedMarks} — exactly right.`
        : `You predicted ${predictedMarks} and scored ${marksEarned}.`,
    '',
    weakTopics.length ? `Where the marks went: ${weakTopics.join(', ')}` : '',
    studyNote ? `What to do next: ${studyNote}` : '',
    '',
    verdictLine(pct),
    '',
    `See every mark: ${href}`,
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n')

  return {
    subject: `Your mark is ready — ${marksEarned}/${totalMarks}${paperRef ? ` (${paperRef})` : ''}`,
    text,
    html: renderBrandedEmailHtml({
      kicker: 'Marking complete',
      preheader: `${marksEarned}/${totalMarks} on ${what}. Every mark is broken down inside.`,
      bodyHtml,
      cta: { label: 'See every mark →', href },
      unsubscribe: {
        label: 'Stop these mark notifications',
        href: unsubscribeHref,
      },
    }),
  }
}

/** Fire-and-forget. Never throws — a failed notification must not fail a mark. */
export function sendMarkReadyEmail(payload: MarkReadyPayload): void {
  try {
    const { subject, html, text } = buildMarkReadyEmail(payload)
    sendEmailAsync({
      to: payload.to,
      subject,
      html,
      text,
      unsubscribeHref: payload.unsubscribeHref,
    })
  } catch (err) {
    console.warn('[mark-ready] email build failed', err)
  }
}

export type MarkFailedPayload = {
  to: string
  recipientName?: string | null
  subjectLabel?: string | null
  paperRef?: string | null
  unsubscribeHref: string
}

/**
 * The other half of the promise.
 *
 * Having told a student they could close the tab, silence is not an acceptable
 * outcome when the mark fails — they are left waiting on an email that is never
 * coming, which is worse than never having offered. Short, no blame, and the
 * only ask is to try again.
 */
export function buildMarkFailedEmail(payload: MarkFailedPayload): {
  subject: string
  html: string
  text: string
} {
  const { recipientName, subjectLabel, paperRef, unsubscribeHref } = payload
  const greeting = recipientName?.trim() || 'there'
  const what = [subjectLabel?.trim(), paperRef?.trim()].filter(Boolean).join(' ')
  const href = `${SITE_URL}/mark`

  const para = (inner: string) =>
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${inner}</p>`

  const bodyHtml =
    para(`Hi ${esc(greeting)},`) +
    para(
      `We said we would email your marks${what ? ` for ${esc(what)}` : ''} — and then the marking failed partway through, so there is nothing to send. That is on us, not on your answer.`
    ) +
    para(
      'Nothing was charged for it. Upload the same photo again and it will usually go straight through the second time.'
    )

  const text = [
    `Hi ${greeting},`,
    '',
    `We said we would email your marks${what ? ` for ${what}` : ''} — and then the marking failed partway through, so there is nothing to send. That is on us, not on your answer.`,
    '',
    'Nothing was charged for it. Upload the same photo again and it will usually go straight through the second time.',
    '',
    `Try again: ${href}`,
  ].join('\n')

  return {
    subject: 'That mark did not finish — nothing was charged',
    text,
    html: renderBrandedEmailHtml({
      kicker: 'Marking failed',
      preheader: 'The marking failed partway through. Nothing was charged.',
      bodyHtml,
      cta: { label: 'Try that mark again →', href },
      unsubscribe: {
        label: 'Stop these mark notifications',
        href: unsubscribeHref,
      },
    }),
  }
}

/** Fire-and-forget twin of `sendMarkReadyEmail`, for the run that never made it. */
export function sendMarkFailedEmail(payload: MarkFailedPayload): void {
  try {
    const { subject, html, text } = buildMarkFailedEmail(payload)
    sendEmailAsync({
      to: payload.to,
      subject,
      html,
      text,
      unsubscribeHref: payload.unsubscribeHref,
    })
  } catch (err) {
    console.warn('[mark-ready] failure email build failed', err)
  }
}
