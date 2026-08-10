import { sendEmail, sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SERIF,
  EMAIL_SANS,
  EMAIL_BORDER,
  EMAIL_HAIRLINE,
  calloutHtml,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  noteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
  stepHtml,
} from '@/lib/email/templates'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

export type MaxVaultTourPayload = {
  to: string
  recipientName?: string | null
  /** Await Resend (scripts / tests). Default fire-and-forget for product paths. */
  wait?: boolean
}

function featureCard(title: string, body: string, status: string): string {
  return `<td valign="top" style="width:50%;padding:0 8px 14px 0">
    <div style="border:1px solid ${EMAIL_BORDER};padding:16px 16px 14px;height:100%">
      <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_BRAND};margin:0 0 8px">${esc(status)}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:16px;font-weight:600;color:${EMAIL_INK};line-height:1.3;margin:0 0 6px">${esc(title)}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:14px;line-height:1.55;color:${EMAIL_BODY}">${body}</div>
    </div>
  </td>`
}

function buildBodyHtml(greeting: string): string {
  const vaultHref = `${SITE_URL}/dashboard/vault`
  const markHref = `${SITE_URL}/mark`
  const coursesHref = `${SITE_URL}/courses`

  return (
    `<p style="margin:0 0 6px;font-family:${EMAIL_SERIF};font-size:17px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 18px;font-family:${EMAIL_SERIF};font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.3;color:${EMAIL_INK}">Your Max Vault is built especially for you.</p>` +
    `<p style="margin:0 0 18px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">This is not a generic resource page. Max put a private exam desk on MarkScheme with your name on it — live diagrams, courses that tighten around your weak topics, sprint packs, coach notes, and more. Everything below is already yours. Open it and use it.</p>` +
    calloutHtml(
      `The more you <strong style="color:${EMAIL_INK}">mark</strong>, the sharper Vault becomes. Courses start from the full syllabus; as your marks expose gaps, we rebuild the path so you get stronger exactly where you lose marks.`,
      'How it improves with you'
    ) +
    sectionHeading('What is waiting in your Vault', 'Open each one — they are Max exclusives.') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
      <tr>
        ${featureCard(
          'Concept Cinema',
          'Watch syllabus ideas <em>move</em> — scrub the diagram, pause on the beat that clicks, then open the full lesson.',
          'Live now'
        )}
        ${featureCard(
          'Courses that adapt',
          'Learn with live diagrams today. Keep marking and the course path rebuilds around your weaknesses.',
          'Gets smarter'
        )}
      </tr>
      <tr>
        ${featureCard(
          'Videos coming soon',
          'Prefer watching when reading feels heavy? A Max video desk for the same hard topics is on the way.',
          'Coming soon'
        )}
        ${featureCard(
          'Sprint · coach · models',
          'Tick the week checklist, beat full-marks models, and open your weekly coach inbox — all on one desk.',
          'Live now'
        )}
      </tr>
    </table>` +
    sectionHeading('Also on Max') +
    linkRowTable(
      linkRow({
        titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Priority deep marking</span>`,
        metaHtml: `<span style="color:${EMAIL_MUTED}">Whole-paper batches jump the Max lane</span>`,
        href: markHref,
        actionLabel: 'Mark →',
      }) +
        linkRow({
          titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Learn with diagrams</span>`,
          metaHtml: `<span style="color:${EMAIL_MUTED}">New course visuals that make hard ideas stick</span>`,
          href: coursesHref,
          actionLabel: 'Courses →',
        }) +
        linkRow({
          titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Your private Vault</span>`,
          metaHtml: `<span style="color:${EMAIL_MUTED}">Cinema, packs, coach, models — built for ${esc(greeting)}</span>`,
          href: vaultHref,
          actionLabel: 'Open Vault →',
        })
    ) +
    sectionHeading('Three moves this week', 'Small reps. Vault does the rest.') +
    `<div style="margin-top:4px">` +
    stepHtml(
      1,
      'Open your Vault.',
      `Start at Concept Cinema for your subject — watch one idea all the way through.`
    ) +
    stepHtml(
      2,
      'Mark two or three questions.',
      'That is how Vault learns where you are weak and rebuilds your course path.'
    ) +
    stepHtml(
      3,
      'Return to the course desk.',
      'Open the lessons pinned to your gaps — diagrams included, videos coming soon.'
    ) +
    `</div>` +
    noteHtml(
      `Whenever you feel stuck in text, come back to the diagrams — and keep an eye out for Max videos. Your Vault is meant to grow with you, ${esc(greeting)}.`
    ) +
    `<p style="margin:8px 0 0;font-size:15px;line-height:1.65;color:${EMAIL_INK}">— ${esc(SITE_NAME)} Max</p>` +
    `<div style="height:1px;background:${EMAIL_HAIRLINE};margin:22px 0 0;font-size:0;line-height:0">&nbsp;</div>`
  )
}

function buildText(greeting: string): string {
  const vaultHref = `${SITE_URL}/dashboard/vault`
  return [
    `Hi ${greeting},`,
    '',
    'Your Max Vault is built especially for you.',
    '',
    'This is not a generic resource page. Max put a private exam desk on MarkScheme for you — live diagrams, courses that tighten around your weak topics, sprint packs, coach notes, and more.',
    '',
    'How it improves with you:',
    'Courses start from the full syllabus. As you mark and expose gaps, Vault rebuilds the path so you get stronger where you lose marks.',
    '',
    'What is waiting in your Vault:',
    '- Concept Cinema (live) — syllabus ideas that move',
    '- Courses that adapt (gets smarter) — learn with live diagrams',
    '- Videos coming soon — when reading feels heavy',
    '- Sprint checklist, full-marks models, weekly coach inbox',
    '- Priority deep marking',
    '',
    `Open your Vault: ${vaultHref}`,
    `Mark a question: ${SITE_URL}/mark`,
    `Courses: ${SITE_URL}/courses`,
    '',
    `— ${SITE_NAME} Max`,
  ].join('\n')
}

/** Beautiful Max Vault tour — personal desk, adaptive courses, diagrams, videos soon. */
export function buildMaxVaultTourEmail(payload: {
  recipientName?: string | null
}): { subject: string; preheader: string; text: string; html: string } {
  const greeting = payload.recipientName?.trim() || 'there'
  const vaultHref = `${SITE_URL}/dashboard/vault`
  const preheader = `${greeting}, your Max Vault is ready — live diagrams, adaptive courses, videos coming soon.`
  const subject = `${greeting}, your Max Vault is built for you`

  return {
    subject,
    preheader,
    text: buildText(greeting),
    html: renderBrandedEmailHtml({
      kicker: 'Max · Resource Vault',
      preheader,
      bodyHtml: buildBodyHtml(greeting),
      cta: { label: 'Open your Max Vault →', href: vaultHref },
      secondaryLinks: [
        { label: 'Mark a question', href: `${SITE_URL}/mark` },
        { label: 'Browse courses', href: `${SITE_URL}/courses` },
      ],
    }),
  }
}

export function sendMaxVaultTourEmail(payload: MaxVaultTourPayload): void | Promise<boolean> {
  const built = buildMaxVaultTourEmail(payload)
  const params = {
    to: payload.to,
    subject: built.subject,
    preheader: built.preheader,
    text: built.text,
    html: built.html,
  }
  if (payload.wait) return sendEmail(params)
  sendEmailAsync(params)
}
