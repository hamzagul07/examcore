import { sendEmail } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BORDER,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  calloutHtml,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  sectionHeading,
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

/**
 * Facts pulled from the student's own Vault, so the email describes what is
 * actually sitting there rather than a generic feature list. Everything here is
 * optional: a claim we cannot substantiate is simply not made.
 */
export type ProfileCompletionVault = {
  subjectLabel: string | null
  /** Live diagrams catalogued for their subject. */
  diagrams: number
  /** Signature diagram title, e.g. "Logic gates — truth to circuit". */
  signature: string | null
  /** Criterion-marked component, e.g. "Solution (SL/HL)". */
  assessmentLabel: string | null
  assessmentMarks: number | null
  /** Heaviest criterion on that component. */
  topCriterion: { letter: string; name: string; marks: number; share: number } | null
}

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
  vault?: ProfileCompletionVault | null
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

  const v = payload.vault ?? null
  const para = (inner: string, muted = false) =>
    `<p style="margin:0 0 16px;font-family:${EMAIL_SERIF};font-size:${muted ? 15 : 16}px;line-height:1.65;color:${muted ? EMAIL_MUTED : EMAIL_BODY}">${inner}</p>`

  /** What is already waiting for them, stated only where we have the facts. */
  const vaultBullets: string[] = []
  if (v?.assessmentLabel && v.topCriterion) {
    const pct = Math.round(v.topCriterion.share * 100)
    vaultBullets.push(
      `<strong>${esc(v.assessmentLabel)}</strong>, broken into the criteria it is actually marked on — ${esc(v.topCriterion.letter)} ${esc(v.topCriterion.name)} alone is ${pct}% of it. It is the biggest thing you can still change once the papers are done.`
    )
  }
  if (v?.diagrams) {
    vaultBullets.push(
      v.signature
        ? `<strong>${v.diagrams} live diagrams</strong> for ${esc(v.subjectLabel || 'your subject')} — including ${esc(v.signature)} — that you can pull apart rather than stare at.`
        : `<strong>${v.diagrams} live diagrams</strong> for ${esc(v.subjectLabel || 'your subject')}.`
    )
  }
  vaultBullets.push(
    'A <strong>question desk</strong> stocked from the topics your own marking says are weakest, not a generic revision list.'
  )
  vaultBullets.push(
    'IB technique that is actually IB — command terms, the IA, criterion bands, and what your grades become out of 45.'
  )

  const vaultHtml = `
    ${sectionHeading('Your Vault', 'Already built, waiting on the profile')}
    <ul style="margin:0 0 6px;padding:0 0 0 18px;font-family:${EMAIL_SERIF};font-size:15.5px;line-height:1.6;color:${EMAIL_BODY}">
      ${vaultBullets.map((b) => `<li style="margin:0 0 10px">${b}</li>`).join('')}
    </ul>`

  const differentHtml = `
    ${sectionHeading('Why this is not the other tools', '')}
    ${para(
      'Most of them read your answer and tell you it looks good. We mark it against the scheme, mark by mark, and then name every one you did not get and the exact words that would have earned it. You also get your own answer rewritten to full marks, annotated so you can see what each addition buys.'
    )}
    ${para(
      'That is the whole product. Not a chatbot with an exam skin on it.',
      true
    )}`

  const askHtml = `
    ${calloutHtml(
      `<p style="margin:0 0 8px;font-family:${EMAIL_SANS};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_BRAND}">One thing back</p>
       <p style="margin:0;font-family:${EMAIL_SERIF};font-size:15.5px;line-height:1.6;color:${EMAIL_BODY}">
         You are one of the first people paying for this, so your answer changes what gets built next.
         <strong>What is your IA on?</strong> Reply to this email and I will point your Vault at it — and tell me the one thing that would make this worth twice what you pay.
       </p>`
    )}`

  const bodyHtml = `
    ${para(greeting)}
    ${para(
      'You are set up and marking, but your profile is missing a couple of things — and until they are there, you are getting a thinner version of what you are paying for.'
    )}
    ${haveLine ? `<div style="margin:0 0 22px">${haveLine}</div>` : ''}
    ${steps.join('')}
    ${para(
      'Both live on your profile and take about two minutes. Everything you have marked so far stays exactly where it is.',
      true
    )}
    ${vaultHtml}
    ${differentHtml}
    ${askHtml}`

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
    '',
    'YOUR VAULT — already built, waiting on the profile',
    v?.assessmentLabel && v.topCriterion
      ? `• ${v.assessmentLabel}, broken into the criteria it is marked on — ${v.topCriterion.letter} ${v.topCriterion.name} alone is ${Math.round(v.topCriterion.share * 100)}% of it.`
      : '',
    v?.diagrams
      ? `• ${v.diagrams} live diagrams for ${v.subjectLabel ?? 'your subject'}${v.signature ? ` — including ${v.signature}` : ''}.`
      : '',
    '• A question desk stocked from the topics your own marking says are weakest.',
    '• IB technique that is actually IB — command terms, the IA, criterion bands, points out of 45.',
    '',
    'WHY THIS IS NOT THE OTHER TOOLS',
    'Most of them read your answer and tell you it looks good. We mark it against the scheme, mark by mark, then name every mark you did not get and the exact words that would have earned it — plus your own answer rewritten to full marks, annotated.',
    '',
    'ONE THING BACK',
    'You are one of the first people paying for this, so your answer changes what gets built next. What is your IA on? Reply and I will point your Vault at it — and tell me the one thing that would make this worth twice what you pay.',
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
