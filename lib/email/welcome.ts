import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_INK,
  EMAIL_MUTED,
  calloutHtml,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  renderBrandedEmailHtml,
  sectionHeading,
  stepHtml,
} from '@/lib/email/templates'
import {
  markHref,
  resolveStudentProfile,
  type EmailStudentProfile,
} from '@/lib/email/student-profile'
import { TIER_MONTHLY_CAPS } from '@/lib/billing/caps'
import { FREE_WHOLE_PAPER_QUESTION_LIMIT } from '@/lib/billing/features'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

/**
 * The welcome email, sent once onboarding is saved.
 *
 * It is board-aware on purpose: onboarding already collected the student's board,
 * level and subjects, and an IB student told they'll be marked "against real
 * Cambridge mark schemes" has been given a reason to distrust every number the
 * product shows them afterwards. Everything here — the marking sentence, the
 * subject links, the third accuracy tip, the courses link — branches on that.
 *
 * The body is a first-session brief rather than a feature list: the three things
 * that decide whether their first upload comes back accurate, then what the free
 * week actually contains. The activation leak is before the first mark, not
 * after it, so this email's whole job is to get one good upload to happen.
 */

type WelcomePayload = {
  email: string
  name?: string | null
  board?: string | null
  level?: string | null
  subjects?: string[] | null
  targetGrade?: string | null
}

/** What the marking is actually measured against — the sentence that was wrong. */
function schemeSentence(ib: boolean): string {
  return ib
    ? `Write an answer, and it comes back graded against the <strong style="color:${EMAIL_INK}">IB assessment criteria</strong> for that subject — the same markbands and command-term wording an IB examiner works from, with the descriptor you landed in and the one above it.`
    : `Write an answer, and it comes back graded against the <strong style="color:${EMAIL_INK}">real Cambridge mark scheme</strong>, mark by mark — M1 for the method, A1 for the answer, B1 for the standalone marks, and which ones you missed.`
}

function subjectsBlock(p: EmailStudentProfile): string {
  if (p.markable.length === 0) return ''

  const rows = p.markable
    .map((s) =>
      linkRow({
        titleHtml:
          `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">${esc(s.label)}</span>` +
          // Cambridge syllabus numbers are how students refer to their own
          // subjects; the IB equivalent is an internal slug, so it stays hidden.
          (p.ib ? '' : `<span style="color:${EMAIL_MUTED}"> · ${esc(s.code)}</span>`),
        href: markHref(s.code),
        actionLabel: 'Mark one →',
      })
    )
    .join('')

  const pending =
    p.notYetMarkable.length > 0
      ? `<p style="margin:10px 0 0;font-size:13px;color:${EMAIL_MUTED}">${esc(
          p.notYetMarkable.map((s) => s.label).join(', ')
        )} ${p.notYetMarkable.length === 1 ? 'is' : 'are'} not live for marking yet.</p>`
      : ''

  return (
    sectionHeading(
      'Your subjects',
      'Each one goes straight to the marker with the subject already selected.'
    ) +
    linkRowTable(rows) +
    pending
  )
}

/** The three things that decide whether the first upload comes back accurate. */
function accuracyBlock(ib: boolean): string {
  const third = ib
    ? stepHtml(
        3,
        'Answer the command term.',
        'IB criteria are chosen by the wording of the question — "evaluate" and "describe" are marked in different bands. Answer the verb that was asked and the marker can credit the band you were aiming for.'
      )
    : stepHtml(
        3,
        'Pick the paper you took it from.',
        'Choose the subject and paper on upload and it marks against that exact scheme, instead of inferring one from the question.'
      )

  return (
    sectionHeading(
      'Three things that make the marking accurate',
      'Worth 60 seconds before your first upload.'
    ) +
    `<div style="margin-top:8px">` +
    stepHtml(
      1,
      'Write it under exam conditions.',
      'Same time limit, same notation, no tidying it up afterwards. A polished answer tells you what the polished version scores — not what you would have scored on the day.'
    ) +
    stepHtml(
      2,
      'Get the whole answer in the photo.',
      'Page flat, decent light, working included. Method marks live in the working, and anything cropped out cannot be credited.'
    ) +
    third +
    `</div>`
  )
}

/** What the free plan actually gives — stated plainly, with its edges named. */
function freePlanBlock(): string {
  return calloutHtml(
    `You are on the <strong>free plan</strong>: ${TIER_MONTHLY_CAPS.free} marked questions a month, against the real mark scheme, with no card and no expiry date. Whole scripts are marked up to the first ${FREE_WHOLE_PAPER_QUESTION_LIMIT} questions.<br><br>
     Nothing you mark is ever deleted, and there is no countdown running. Upgrade only once you have seen it mark something of yours.`,
    `📄 Your free plan`
  )
}

function buildBodyHtml(greeting: string, p: EmailStudentProfile, targetGrade: string | null): string {
  const parts: string[] = [
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>`,
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">Your ${esc(
      p.levelLabel
    )} account is ready. ${schemeSentence(p.ib)}</p>`,
  ]

  if (targetGrade) {
    parts.push(
      `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${EMAIL_BODY}">You are aiming for <strong style="color:${EMAIL_INK}">${esc(
        targetGrade
      )}</strong> — every script you mark gets measured against that, so you always know the distance rather than guessing at it.</p>`
    )
  }

  const subjects = subjectsBlock(p)
  if (subjects) parts.push(subjects, `<div style="height:22px"></div>`)

  parts.push(accuracyBlock(p.ib), `<div style="height:10px"></div>`, freePlanBlock())

  return parts.join('\n')
}

function buildText(
  greeting: string,
  p: EmailStudentProfile,
  targetGrade: string | null,
  ctaHref: string
): string {
  const lines: string[] = [
    `Hi ${greeting},`,
    '',
    p.ib
      ? `Your IB Diploma account is ready. Write an answer and it comes back graded against the IB assessment criteria for that subject — the same markbands and command-term wording an IB examiner works from.`
      : `Your ${p.levelLabel} account is ready. Write an answer and it comes back graded against the real Cambridge mark scheme, mark by mark — M1 for the method, A1 for the answer, B1 for the standalone marks.`,
  ]

  if (targetGrade) {
    lines.push('', `You are aiming for ${targetGrade}. Every script gets measured against it.`)
  }

  if (p.markable.length > 0) {
    lines.push('', 'Your subjects:')
    for (const s of p.markable) {
      lines.push(`- ${s.label}${p.ib ? '' : ` (${s.code})`}: ${markHref(s.code)}`)
    }
    if (p.notYetMarkable.length > 0) {
      lines.push(
        `${p.notYetMarkable.map((s) => s.label).join(', ')} ${
          p.notYetMarkable.length === 1 ? 'is' : 'are'
        } not live for marking yet.`
      )
    }
  }

  lines.push(
    '',
    'Three things that make the marking accurate:',
    '1. Write it under exam conditions — same time limit, no tidying it up afterwards.',
    '2. Get the whole answer in the photo, working included. Method marks live in the working.',
    p.ib
      ? '3. Answer the command term — IB criteria are chosen by the wording of the question.'
      : '3. Pick the paper you took it from, so it marks against that exact scheme.',
    '',
    `You are on the free plan: ${TIER_MONTHLY_CAPS.free} marked questions a month, no card, no expiry. Whole scripts are marked up to the first ${FREE_WHOLE_PAPER_QUESTION_LIMIT} questions.`,
    'Nothing you mark is ever deleted, and there is no countdown running.',
    '',
    `Mark your first question: ${ctaHref}`,
    p.ib
      ? `Free IB courses: ${SITE_URL}/ib/courses`
      : `Free courses: ${SITE_URL}/courses`,
    p.ib
      ? `IB past papers: ${SITE_URL}/ib/past-papers`
      : `Past papers: ${SITE_URL}/past-papers`,
    `Your dashboard: ${SITE_URL}/dashboard`,
    '',
    `— ${SITE_NAME}`
  )

  return lines.join('\n')
}

export function sendWelcomeEmail(payload: WelcomePayload): void {
  const greeting = payload.name?.trim() || 'there'
  const p = resolveStudentProfile(payload)
  const targetGrade = payload.targetGrade?.trim() || null

  // Deep-link the CTA into their first live subject so the marker opens with the
  // subject already chosen — one less decision between this email and a mark.
  const ctaHref = markHref(p.markable[0]?.code)

  const links = p.ib
    ? [
        { label: 'Free IB courses', href: `${SITE_URL}/ib/courses` },
        { label: 'IB past papers', href: `${SITE_URL}/ib/past-papers` },
        { label: 'Your dashboard', href: `${SITE_URL}/dashboard` },
      ]
    : [
        { label: 'Free courses', href: `${SITE_URL}/courses` },
        { label: 'Past papers', href: `${SITE_URL}/past-papers` },
        { label: 'Your dashboard', href: `${SITE_URL}/dashboard` },
      ]

  const preheader = p.ib
    ? 'Marked against the IB criteria — three things that make it accurate.'
    : 'Marked against the real Cambridge scheme — three things that make it accurate.'

  const bodyHtml = buildBodyHtml(greeting, p, targetGrade)

  sendEmailAsync({
    to: payload.email,
    subject: `Welcome to ${SITE_NAME} — your ${p.levelLabel} marking is ready`,
    preheader,
    text: buildText(greeting, p, targetGrade, ctaHref),
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Mark your first question →', href: ctaHref },
      secondaryLinks: links,
    }),
  })
}
