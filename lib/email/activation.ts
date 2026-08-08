import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_INK,
  EMAIL_MUTED,
  calloutHtml,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  noteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
} from '@/lib/email/templates'
import {
  daysUntilExam,
  markHref,
  resolveStudentProfile,
  type EmailStudentInput,
} from '@/lib/email/student-profile'
import { SITE_URL } from '@/lib/site-config'

/**
 * The activation series — three emails to someone who created an account and
 * never marked anything.
 *
 * Measured 2026-08-08: 135 of 194 accounts finished onboarding and then marked
 * nothing, and 20 of the 20 newest accounts had not marked either. The drop is
 * not decay over weeks; it is a wall at the first session. So these do not say
 * "come back" — they carry the thing the student was going to have to find on
 * their own: their own subject, one question, already chosen.
 *
 * Every recipient has subjects set (all 135 did), so naming them is safe. The
 * exam date is present for roughly 4 in 10 and is used only when it exists.
 *
 * Kept deliberately short. This student has already decided not to do the thing
 * once; a longer email is not more persuasive, it is more to ignore.
 */

export type ActivationPayload = EmailStudentInput & {
  to: string
  recipientName?: string | null
  examDate?: string | null
  unsubscribeHref: string
}

function greetingFor(name?: string | null): string {
  return name?.trim() || 'there'
}

/** Exam countdown chip. Only rendered when a date is set and still ahead. */
function examChip(examDate?: string | null): string {
  const days = daysUntilExam(examDate)
  if (days === null) return ''
  return `<div style="display:inline-block;background:#f4f1ea;border-radius:999px;padding:8px 14px;margin:0 0 20px;font-size:13.5px;font-weight:700;color:${EMAIL_INK}">🗓️ ${days} ${
    days === 1 ? 'day' : 'days'
  } until your exam</div>`
}

/** Their subjects as one-click rows. The whole point of the first email. */
function subjectRows(subjects: { label: string; code: string }[], ib: boolean): string {
  const rows = subjects
    .map((s) =>
      linkRow({
        titleHtml:
          `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">${esc(s.label)}</span>` +
          // IB subject codes are internal slugs; Cambridge ones are how
          // students refer to their own subjects.
          (ib ? '' : `<span style="color:${EMAIL_MUTED}"> · ${esc(s.code)}</span>`),
        href: markHref(s.code),
        actionLabel: 'Mark one →',
      })
    )
    .join('')
  return linkRowTable(rows)
}

// ---------------------------------------------------------------------------
// Stage 1 — day 2. "Your subject is already set up."
// ---------------------------------------------------------------------------

export function sendActivationFirstMarkEmail(payload: ActivationPayload): void {
  const greeting = greetingFor(payload.recipientName)
  const p = resolveStudentProfile(payload)
  const subjects = p.markable.map((s) => ({ label: s.label, code: s.code }))
  const ctaHref = markHref(subjects[0]?.code)
  const scheme = p.ib ? 'the IB assessment criteria' : 'the real Cambridge mark scheme'

  const preheader = subjects[0]
    ? `Your ${subjects[0].label} paper is already set up — one question takes two minutes.`
    : 'One question takes two minutes, and it is marked against the real scheme.'

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">You set up your account but haven't marked anything yet. That is the only step that shows you anything — everything else on the site is just reading.</p>` +
    examChip(payload.examDate) +
    (subjects.length > 0
      ? sectionHeading(
          'Your subjects are ready',
          'Each link opens the marker with the subject already chosen.'
        ) +
        subjectRows(subjects, p.ib) +
        // The row table ends on a hairline; without this the callout's border
        // lands 4px below it and reads as one broken box.
        `<div style="height:22px"></div>`
      : '') +
    calloutHtml(
      `Take a question you have already done — homework, a past paper, anything with working on it. Photograph it or type it. It comes back graded against <strong>${scheme}</strong>, mark by mark, showing which ones you got and which you missed.`,
      '⏱️ About two minutes'
    )

  const text = [
    `Hi ${greeting},`,
    '',
    "You set up your account but haven't marked anything yet. That is the only step that shows you anything.",
    '',
    ...(subjects.length > 0
      ? ['Your subjects:', ...subjects.map((s) => `- ${s.label}: ${markHref(s.code)}`), '']
      : []),
    `Take a question you have already done, photograph it or type it, and it comes back graded against ${scheme} — mark by mark.`,
    '',
    `Mark your first question: ${ctaHref}`,
    '',
    `Turn off getting-started emails: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: subjects[0]
      ? `Your ${subjects[0].label} paper is ready to mark`
      : 'Your first question takes two minutes',
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Mark your first question →', href: ctaHref },
      unsubscribe: { label: 'Turn off getting-started emails', href: payload.unsubscribeHref },
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}

// ---------------------------------------------------------------------------
// Stage 2 — day 5. Show the output, since describing it clearly did not work.
// ---------------------------------------------------------------------------

export function sendActivationProofEmail(payload: ActivationPayload): void {
  const greeting = greetingFor(payload.recipientName)
  const p = resolveStudentProfile(payload)
  // No upload required — the example is a finished mark, which is the whole
  // point for someone who has not been willing to photograph anything yet.
  const exampleHref = `${SITE_URL}/mark?example=1`
  const scheme = p.ib ? 'IB criteria' : 'the Cambridge scheme'

  const preheader = 'A finished mark, no upload needed — see what the feedback actually looks like.'

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555">Uploading your own work first is a fair thing to be unsure about. So here is a finished one instead — nothing to submit, just the feedback.</p>` +
    sectionHeading('What comes back', 'On a real answer, marked against ' + scheme) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      ${[
        ['Marks where they were earned', 'Annotated on your own handwriting, line by line — not a paragraph at the bottom.'],
        ['The marks you missed', 'Named, with what the scheme wanted instead.'],
        ['Your answer at full marks', 'Rewritten so you can see the distance between the two.'],
      ]
        .map(
          ([title, body]) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #f0ece4">
              <div style="font-size:15px;font-weight:600;color:${EMAIL_INK}">${title}</div>
              <div style="font-size:13.5px;line-height:1.55;color:${EMAIL_MUTED};margin-top:3px">${body}</div>
            </td></tr>`
        )
        .join('')}
    </table>` +
    noteHtml(
      'When you want to try it on your own work, any question with working on it will do — it does not have to be a full paper.'
    )

  const text = [
    `Hi ${greeting},`,
    '',
    'Uploading your own work first is a fair thing to be unsure about. Here is a finished mark instead — nothing to submit.',
    '',
    `What comes back, on a real answer marked against ${scheme}:`,
    '- Marks annotated where they were earned, on the handwriting itself.',
    '- The marks you missed, named, with what the scheme wanted instead.',
    '- Your answer rewritten to full marks, so you can see the distance.',
    '',
    `See a marked answer: ${exampleHref}`,
    '',
    `Turn off getting-started emails: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: 'See a marked answer — no upload needed',
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'See a marked answer →', href: exampleHref },
      unsubscribe: { label: 'Turn off getting-started emails', href: payload.unsubscribeHref },
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}

// ---------------------------------------------------------------------------
// Stage 3 — day 10. The last one, and the only one that asks rather than tells.
// ---------------------------------------------------------------------------

export function sendActivationFeedbackEmail(payload: ActivationPayload): void {
  const greeting = greetingFor(payload.recipientName)

  const preheader = 'One question, and it is genuinely a question — what stopped you?'

  // Plain on purpose. Three emails of product voice have not worked on this
  // person; a fourth in the same register is noise. This one should read like
  // it was typed by someone who wants the answer, because it is.
  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${EMAIL_BODY}">You signed up for MarkScheme a week or so ago and never marked anything. I would genuinely like to know why.</p>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${EMAIL_BODY}">Was it not what you expected? Did the upload step put you off? Did you just get busy, or did something not work? Any of those is useful, and one line is plenty — just reply to this email and it comes straight to me.</p>` +
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:${EMAIL_BODY}">This is the last of these you'll get either way.</p>`

  const text = [
    `Hi ${greeting},`,
    '',
    'You signed up for MarkScheme a week or so ago and never marked anything. I would genuinely like to know why.',
    '',
    'Was it not what you expected? Did the upload step put you off? Did you just get busy, or did something not work? One line is plenty — just reply to this email.',
    '',
    "This is the last of these you'll get either way.",
    '',
    `Turn off getting-started emails: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: 'What stopped you?',
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      unsubscribe: { label: 'Turn off getting-started emails', href: payload.unsubscribeHref },
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}

// ---------------------------------------------------------------------------
// Separate track — signed up, never finished onboarding.
// ---------------------------------------------------------------------------

/**
 * These accounts have no subjects, so nothing here can be personalised. The one
 * useful thing to say is how short the remaining step is.
 */
export function sendFinishOnboardingEmail(payload: {
  to: string
  recipientName?: string | null
  unsubscribeHref: string
}): void {
  const greeting = greetingFor(payload.recipientName)
  const href = `${SITE_URL}/onboarding`
  const preheader = 'Pick your subjects and the marker opens on the right paper.'

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555">You created an account but didn't finish picking your subjects, so there's nothing set up to mark against yet.</p>` +
    calloutHtml(
      'It is four questions — your board, your subjects, your year, and when your exam is. After that the marker opens on the right paper instead of asking you to find it.',
      '⏱️ Under a minute'
    )

  const text = [
    `Hi ${greeting},`,
    '',
    "You created an account but didn't finish picking your subjects, so there's nothing set up to mark against yet.",
    '',
    'It is four questions — your board, your subjects, your year, and when your exam is.',
    '',
    `Finish setting up: ${href}`,
    '',
    `Turn off getting-started emails: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: 'Finish setting up — it takes under a minute',
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Finish setting up →', href },
      unsubscribe: { label: 'Turn off getting-started emails', href: payload.unsubscribeHref },
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}
