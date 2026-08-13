import 'server-only'

import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BRAND as BRAND,
  EMAIL_INK as INK,
  EMAIL_SERIF,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  statCell,
} from '@/lib/email/templates'
import { SITE_URL } from '@/lib/site-config'

/**
 * "Your mark is ready" — sent when a mark finishes after the student has left.
 *
 * Marking a handwritten script against a real scheme costs 2–6 minutes and no
 * amount of tuning takes that to zero. What it does not have to cost is the
 * student's attention for the whole of it: the run now survives the tab closing,
 * and this is what turns a three-minute stare into a three-minute absence.
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
  unsubscribeHref: string
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

  const bodyHtml =
    para(`Hi ${esc(greeting)},`) +
    para(
      `You closed the tab while ${esc(what)} was being marked, so here it is. Nothing was lost — the examiner finished the job without you.`
    ) +
    statsRow +
    predictionLine +
    para(verdictLine(pct))

  const text = [
    `Hi ${greeting},`,
    '',
    `You closed the tab while ${what} was being marked, so here it is. Nothing was lost — the examiner finished the job without you.`,
    '',
    `Marks awarded: ${marksEarned}/${totalMarks} (${pct}%)`,
    gap == null
      ? ''
      : gap === 0
        ? `You predicted ${predictedMarks} — exactly right.`
        : `You predicted ${predictedMarks} and scored ${marksEarned}.`,
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
