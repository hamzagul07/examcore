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
} from '@/lib/email/templates'
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'

type MockPackConfirmPayload = {
  email: string
  syllabusCode?: string | null
  predictedGrade?: string | null
}

/**
 * Instant confirmation after Results Day mock-pack capture.
 * Keeps the November promise honest and hands useful next steps now.
 */
export function sendMockPackConfirmEmail(payload: MockPackConfirmPayload): void {
  const code = payload.syllabusCode?.trim() || null
  const grade = payload.predictedGrade?.trim() || null

  const holdHref = code
    ? `${SITE_URL}/tools/will-my-grade-hold?code=${encodeURIComponent(code)}`
    : `${SITE_URL}/tools/will-my-grade-hold`
  const resultsHref = code
    ? `${SITE_URL}/results-2026/caie/${encodeURIComponent(code)}`
    : `${SITE_URL}/results-2026`
  const markHref = code
    ? `${SITE_URL}/mark?subject=${encodeURIComponent(code)}`
    : `${SITE_URL}/mark`

  const preheader = code
    ? `You're on the November mock pack list for ${code}. Results Day tools inside.`
    : "You're on the November mock pack list. Results Day tools inside."

  const gradeLine = grade
    ? calloutHtml(
        `Your last check predicted <strong style="color:${EMAIL_INK}">${esc(grade)}</strong>. Confirm against your statement when grades land.`
      )
    : calloutHtml(
        'AS &amp; A Level grades: <strong>11 Aug</strong>. Threshold tables: typically <strong>~13 Aug</strong>. IGCSE/O Level: <strong>18 Aug</strong>.'
      )

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${EMAIL_BODY}">You're on the list for the <strong style="color:${EMAIL_INK}">November mock pack</strong> — one past-paper focus path per week when marking actually matters again. No summer spam.</p>` +
    gradeLine +
    sectionHeading('While you wait') +
    linkRowTable(
      linkRow({
        titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Will my grade hold?</span>`,
        metaHtml: `<span style="color:${EMAIL_MUTED}">Stress-test a raw mark against thresholds</span>`,
        href: holdHref,
        actionLabel: 'Open →',
      }) +
        linkRow({
          titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Results Day hub</span>`,
          metaHtml: `<span style="color:${EMAIL_MUTED}">Dates, remarks, subject pages</span>`,
          href: resultsHref,
          actionLabel: 'Open →',
        }) +
        linkRow({
          titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">Mark a question free</span>`,
          metaHtml: `<span style="color:${EMAIL_MUTED}">Scheme-aligned feedback on handwriting</span>`,
          href: markHref,
          actionLabel: 'Mark →',
        })
    )

  const text = [
    "You're on the MarkScheme November mock pack list — one past-paper focus path per week when marking matters again. No summer spam.",
    '',
    grade
      ? `Your last check predicted ${grade}. Confirm against your statement when grades land.`
      : 'AS & A Level grades: 11 Aug. Thresholds: ~13 Aug. IGCSE/O Level: 18 Aug.',
    '',
    `Will my grade hold?: ${holdHref}`,
    `Results Day hub: ${resultsHref}`,
    `Mark free: ${markHref}`,
    '',
    `Unsubscribe: mailto:${CONTACT_EMAIL}?subject=unsubscribe%20mock%20pack`,
    '',
    `— ${SITE_NAME}`,
  ].join('\n')

  sendEmailAsync({
    to: payload.email,
    subject: code
      ? `${SITE_NAME}: November mock pack confirmed (${code})`
      : `${SITE_NAME}: November mock pack confirmed`,
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Will my grade hold? →', href: holdHref },
      secondaryLinks: [
        { label: 'Results Day hub', href: resultsHref },
        { label: 'Mark a question', href: markHref },
      ],
    }),
    unsubscribeHref: `mailto:${CONTACT_EMAIL}?subject=unsubscribe%20mock%20pack`,
  })
}
