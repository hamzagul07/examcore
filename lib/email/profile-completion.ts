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
import { getSubjectById, MAX_PROFILE_SUBJECTS } from '@/lib/profile-options'
import { SITE_URL } from '@/lib/site-config'

/**
 * Subjects are only editable through the onboarding wizard — /account/profile
 * renders a username and a name field and passes subjects straight through
 * with no picker. Linking there told students to do something the page cannot
 * do. `?rerun=1` pre-fills the wizard from their saved profile.
 */
const SUBJECTS_HREF = `${SITE_URL}/onboarding?rerun=1`

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
  /** Whether they have marked anything yet. The Day-0 send always sees false. */
  hasMarked?: boolean
  /** How many subjects this qualification normally involves, if known. */
  expectedSubjects?: number | null
  /** Marketing plan name, e.g. "Scholar". Stated as fact, never as a promise
   * about which features that plan includes — entitlements move, and an email
   * is the worst place to make a commitment the pricing page has to keep. */
  planLabel?: string | null
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
  // Sign-up names arrive however the student typed them — "tony lai" reads like
  // a database row, not a greeting, so the first letter is normalised. Names
  // already capitalised, and anything unusual like "McRae", are left alone.
  const rawFirst = payload.recipientName?.trim()?.split(/\s+/)[0] || null
  const name =
    rawFirst && /^[a-z]/.test(rawFirst)
      ? rawFirst[0].toUpperCase() + rawFirst.slice(1)
      : rawFirst
  // With no name we can trust, address them by their plan rather than leaving a
  // bare "Hi," — which reads like an unfinished mail merge, and is exactly the
  // impression an early subscriber should not get.
  const address = name ?? payload.planLabel?.trim() ?? null
  const greeting = address ? `Hi ${esc(address)},` : 'Hi,'
  const levelLabel = payload.level?.trim() || null
  const expected = payload.expectedSubjects ?? null

  const missingSubjects = expected !== null ? Math.max(expected - labels.length, 0) : 0
  const needsSubjects = missingSubjects > 0 || labels.length <= 1
  const needsDate = !payload.hasExamDate

  // Only a real name goes in the subject line. "Scholar, your Vault is ready"
  // announces itself as automated before the email is even opened.
  const subject = name
    ? `${name}, your Vault is ready — two minutes to finish setting it up`
    : 'Your Vault is ready — two minutes to finish setting it up'

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
          ? `You have ${labels.length === 1 ? 'one subject' : `${labels.length} subjects`} saved, and can file up to ${MAX_PROFILE_SUBJECTS}. Each one you add gets its own desk, its own question bank and its own diagrams.`
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
         <strong>What is your IA on?</strong> Reply to this email and I will point your Vault straight at it —
         the criteria, the diagrams, the practice. And tell me the one thing that would make this better for you,
         because that is what decides what gets built next.
       </p>`
    )}`

  /**
   * A second button, matching the primary CTA's styling. The Vault is the thing
   * worth seeing, but the profile is the thing that has to be done first — so
   * this sits after the Vault section rather than competing at the top.
   */
  const vaultButton = `<p style="margin:22px 0 0"><a href="${SITE_URL}/dashboard/vault" style="display:inline-block;font-family:${EMAIL_SANS};background:${EMAIL_BRAND};color:#fff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:.02em;padding:15px 30px;border-radius:3px">Open your Vault</a></p>`

  // When the greeting already used the plan as the form of address, naming it
  // again in the next sentence reads as a template seam.
  const planNamedInGreeting = !name && Boolean(payload.planLabel)
  const planLine = payload.planLabel
    ? para(
        planNamedInGreeting
          ? 'Welcome. You are in with the students who work the same way you do: marking real answers against the real scheme instead of guessing at what an examiner wanted.'
          : `You are on <strong>${esc(payload.planLabel)}</strong> — welcome. You are in with the students who work the same way you do: marking real answers against the real scheme instead of guessing at what an examiner wanted.`
      )
    : ''

  const communityHtml = `
    ${sectionHeading('The community', 'Other IB students, same week as you')}
    ${para(
      `There is an IB room where students post what they are stuck on and what came back when they marked it — IAs, criteria, papers, and the arguments about which is harder. Somebody there is doing your subject. <a href="${SITE_URL}/community" style="color:${EMAIL_BRAND};font-weight:700;text-decoration:none">Have a look</a>.`
    )}`

  const comingHtml = para(
    'The IB side gets added to constantly — criteria, diagrams, question desks, subject by subject. If something you need is not there, tell me and it gets built.',
    true
  )

  const bodyHtml = `
    ${para(greeting)}
    ${planLine}
    ${para(
      payload.hasMarked
        ? 'Your Vault is built and waiting. There are just a couple of things missing from your profile, and until they are there you are seeing a thinner version of it than you should be.'
        : 'Your Vault is built and waiting, and the fastest way to fill it is to mark one answer. Everything in it — the weak topics, the question desk, the rewrite — is built out of what your own marking shows. Until you mark something it can only guess.'
    )}
    ${haveLine ? `<div style="margin:0 0 22px">${haveLine}</div>` : ''}
    ${steps.join('')}
    ${para(
      'Both live on your profile and take about two minutes. Everything you have marked so far stays exactly where it is.',
      true
    )}
    ${vaultHtml}
    ${vaultButton}
    ${differentHtml}
    ${communityHtml}
    ${comingHtml}
    ${askHtml}`

  const text = [
    greeting,
    '',
    payload.planLabel
      ? planNamedInGreeting
        ? 'Welcome. You are in with the students who work the same way you do: marking real answers against the real scheme instead of guessing at what an examiner wanted.'
        : `You are on ${payload.planLabel} — welcome. You are in with the students who work the same way you do: marking real answers against the real scheme instead of guessing at what an examiner wanted.`
      : '',
    '',
    payload.hasMarked
      ? 'Your Vault is built and waiting. There are just a couple of things missing from your profile, and until they are there you are seeing a thinner version of it than you should be.'
      : 'Your Vault is built and waiting, and the fastest way to fill it is to mark one answer. Everything in it is built out of what your own marking shows — until you mark something it can only guess.',
    '',
    labels.length ? `On your profile now: ${labels.join(', ')}` : '',
    '',
    needsSubjects
      ? `1. Add the rest of your subjects — you can file up to ${MAX_PROFILE_SUBJECTS}. Each one gets its own desk, question bank and diagrams: ${SUBJECTS_HREF}`
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
    `Open your Vault: ${SITE_URL}/dashboard/vault`,
    '',
    'WHY THIS IS NOT THE OTHER TOOLS',
    'Most of them read your answer and tell you it looks good. We mark it against the scheme, mark by mark, then name every mark you did not get and the exact words that would have earned it — plus your own answer rewritten to full marks, annotated.',
    '',
    'THE COMMUNITY',
    `There is an IB room where students post what they are stuck on and what came back when they marked it — IAs, criteria, papers. Somebody there is doing your subject: ${SITE_URL}/community`,
    '',
    'The IB side gets added to constantly — criteria, diagrams, question desks, subject by subject. If something you need is not there, tell me and it gets built.',
    '',
    'ONE THING BACK',
    'What is your IA on? Reply and I will point your Vault straight at it — the criteria, the diagrams, the practice. And tell me the one thing that would make this better for you, because that is what decides what gets built next.',
  ]
    .filter((l) => l !== '')
    .join('\n')

  const html = renderBrandedEmailHtml({
    kicker: 'Your profile',
    preheader: needsSubjects
      ? 'Your other subjects are missing — each one gets its own desk.'
      : 'Add your exam date so we can plan backwards from it.',
    bodyHtml,
    cta: !payload.hasMarked
      ? { label: 'Mark your first answer', href: `${SITE_URL}/mark` }
      : needsSubjects
      ? { label: 'Add your subjects', href: SUBJECTS_HREF }
      : { label: 'Set your exam date', href: `${SITE_URL}/account/exam` },
    secondaryLinks: [
      ...(!payload.hasMarked && needsSubjects
        ? [{ label: 'Add your subjects', href: SUBJECTS_HREF }]
        : []),
      ...(needsDate ? [{ label: 'Set your exam date', href: `${SITE_URL}/account/exam` }] : []),
    ],
  })

  return { subject, html, text }
}

export async function sendProfileCompletionEmail(
  payload: ProfileCompletionPayload
): Promise<boolean> {
  const { subject, html, text } = buildProfileCompletionEmail(payload)
  return sendEmail({ to: payload.to, subject, html, text })
}
