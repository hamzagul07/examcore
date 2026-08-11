import { sendEmail } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BORDER,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  stepHtml,
} from '@/lib/email/templates'
import { getSubjectById } from '@/lib/profile-options'
import { SITE_URL } from '@/lib/site-config'

/**
 * Nudge a subscriber whose profile is too thin for the product to personalise.
 *
 * Written for the case where someone pays and then gets a worse experience than
 * they bought, purely because onboarding was skipped: an IB student with one of
 * six subjects, or nobody with an exam date, gets no sprint pack, no countdown
 * and a Vault that can only build one desk. That is our problem to fix, not
 * theirs, so the email leads with what is missing and why it costs them —
 * never with a feature list.
 */

export type ProfileCompletionPayload = {
  to: string
  recipientName?: string | null
  /** Profile subject ids or display names. */
  subjects?: string[] | null
  level?: string | null
  board?: string | null
  hasExamDate: boolean
  /** How many subjects this qualification normally involves, if known. */
  expectedSubjects?: number | null
  wait?: boolean
}

function resolveLabels(ids: string[] | null | undefined, level?: string | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids ?? []) {
    const opt = getSubjectById(id, level ?? undefined)
    const label = opt?.label?.trim() || id.trim()
    if (!label || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    out.push(label)
  }
  return out
}

function pill(label: string): string {
  return `<span style="display:inline-block;font-family:${EMAIL_SANS};font-size:12px;font-weight:700;letter-spacing:.02em;color:${EMAIL_INK};background:#fff;border:1.5px solid ${EMAIL_BORDER};padding:7px 12px;margin:0 6px 8px 0">${esc(label)}</span>`
}

export function buildProfileCompletionEmail(payload: ProfileCompletionPayload): {
  subject: string
  html: string
  text: string
} {
  const labels = resolveLabels(payload.subjects, payload.level)
  const name = payload.recipientName?.trim()?.split(/\s+/)[0] || null
  const greeting = name ? `Hi ${esc(name)},` : 'Hi,'
  const levelLabel = payload.level?.trim() || null
  const expected = payload.expectedSubjects ?? null

  const missingSubjects = expected !== null ? Math.max(expected - labels.length, 0) : 0
  const needsSubjects = missingSubjects > 0 || labels.length <= 1
  const needsDate = !payload.hasExamDate

  const subject = needsSubjects && needsDate
    ? 'Two things missing from your profile (2 minutes)'
    : needsSubjects
      ? 'Your other subjects are missing from your profile'
      : 'Add your exam date and we can plan backwards from it'

  const haveLine =
    labels.length > 0
      ? `<p style="margin:0 0 10px;font-family:${EMAIL_SANS};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_MUTED}">On your profile now</p>${labels.map(pill).join('')}`
      : ''

  const steps: string[] = []
  if (needsSubjects) {
    steps.push(
      stepHtml(
        steps.length + 1,
        'Add the rest of your subjects',
        levelLabel
          ? `You have ${labels.length === 1 ? 'one subject' : `${labels.length} subjects`} saved${expected ? ` — ${levelLabel} is usually ${expected}` : ''}. Each one you add gets its own desk, its own question bank and its own diagrams.`
          : 'Each subject you add gets its own desk, its own question bank and its own diagrams.'
      )
    )
  }
  if (needsDate) {
    steps.push(
      stepHtml(
        steps.length + 1,
        'Set your exam date',
        'Without it we cannot count backwards. With it you get the countdown, and the sprint pack unlocks automatically in the fortnight before your first paper.'
      )
    )
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">${greeting}</p>
    <p style="margin:0 0 20px;font-family:${EMAIL_SERIF};font-size:16px;line-height:1.65;color:${EMAIL_BODY}">
      You are set up and marking, but your profile is missing a couple of things — and until they are there, you are getting a thinner version of what you are paying for.
    </p>
    ${haveLine ? `<div style="margin:0 0 22px">${haveLine}</div>` : ''}
    ${steps.join('')}
    <p style="margin:22px 0 0;font-family:${EMAIL_SERIF};font-size:15px;line-height:1.6;color:${EMAIL_MUTED}">
      Both live on your profile and take about two minutes. Everything you have marked so far stays exactly where it is.
    </p>`

  const text = [
    greeting,
    '',
    'You are set up and marking, but your profile is missing a couple of things — and until they are there, you are getting a thinner version of what you are paying for.',
    '',
    labels.length ? `On your profile now: ${labels.join(', ')}` : '',
    '',
    needsSubjects
      ? `1. Add the rest of your subjects${expected ? ` (${levelLabel ?? 'your course'} is usually ${expected})` : ''}. Each one gets its own desk, question bank and diagrams: ${SITE_URL}/account/profile`
      : '',
    needsDate
      ? `${needsSubjects ? '2' : '1'}. Set your exam date so we can count backwards, and so the sprint pack unlocks before your first paper: ${SITE_URL}/account/exam`
      : '',
    '',
    'Both take about two minutes. Everything you have marked so far stays where it is.',
  ]
    .filter((l) => l !== '')
    .join('\n')

  const html = renderBrandedEmailHtml({
    kicker: 'Your profile',
    preheader: needsSubjects
      ? 'Your other subjects are missing — each one gets its own desk.'
      : 'Add your exam date so we can plan backwards from it.',
    bodyHtml,
    cta: needsSubjects
      ? { label: 'Add your subjects', href: `${SITE_URL}/account/profile` }
      : { label: 'Set your exam date', href: `${SITE_URL}/account/exam` },
    secondaryLinks: needsSubjects && needsDate
      ? [{ label: 'Set your exam date', href: `${SITE_URL}/account/exam` }]
      : [],
  })

  return { subject, html, text }
}

export async function sendProfileCompletionEmail(
  payload: ProfileCompletionPayload
): Promise<boolean> {
  const { subject, html, text } = buildProfileCompletionEmail(payload)
  return sendEmail({ to: payload.to, subject, html, text })
}
