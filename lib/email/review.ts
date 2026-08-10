import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_INK,
  EMAIL_MUTED,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  noteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
} from '@/lib/email/templates'
import { topicDrillHref } from '@/lib/insights/drill-link'
import { SITE_URL } from '@/lib/site-config'

export type ReviewDigestTopic = {
  name: string
  subjectLabel: string
  /** Kept so each topic can deep-link into a drill. A digest that names five
   * topics and offers one generic button makes the student do the routing. */
  subjectCode: string
  topicCode: string
}

/** Topics listed individually before we collapse to a count. */
const MAX_LISTED = 5

/**
 * "Topics due for review" re-engagement email. Fire-and-forget. Always include
 * the one-click unsubscribe link (kind 'review').
 *
 * Every topic is its own one-click drill: spaced review only works if the gap
 * between "you owe this topic" and "you are answering a question on it" is as
 * close to zero as we can make it.
 */
export function sendReviewDigestEmail(payload: {
  to: string
  recipientName?: string | null
  topics: ReviewDigestTopic[]
  unsubscribeHref: string
}): void {
  const { to, recipientName, topics, unsubscribeHref } = payload
  const n = topics.length
  const greeting = recipientName?.trim() || 'there'
  const listed = topics.slice(0, MAX_LISTED)
  const overflow = n - listed.length
  const reviewUrl = `${SITE_URL}/dashboard/review`

  const rows = listed
    .map((t) =>
      linkRow({
        titleHtml:
          `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">${esc(t.name)}</span>` +
          `<span style="color:${EMAIL_MUTED}"> · ${esc(t.subjectLabel)}</span>`,
        href: `${SITE_URL}${topicDrillHref(t.subjectCode, t.topicCode)}`,
        actionLabel: 'Mark one →',
      })
    )
    .join('')

  const overflowHtml =
    overflow > 0
      ? `<p style="margin:10px 0 0;font-size:13px;color:${EMAIL_MUTED}">+ ${overflow} more waiting on your review page.</p>`
      : ''

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">${n} ${
      n === 1 ? 'topic is' : 'topics are'
    } due. Close one before it fades — a single marked question resets the clock.</p>` +
    sectionHeading('Due today', 'One question each. Two minutes a topic.') +
    linkRowTable(rows) +
    overflowHtml +
    `<div style="height:22px"></div>` +
    noteHtml(
      'Marking a topic you still know is not wasted — that is the repetition that makes it survive to the exam.'
    )

  const text = [
    `Hi ${greeting},`,
    '',
    `${n} ${n === 1 ? 'topic is' : 'topics are'} due. One marked question each is enough to reset the clock:`,
    '',
    ...listed.map(
      (t) =>
        `- ${t.name} (${t.subjectLabel}): ${SITE_URL}${topicDrillHref(t.subjectCode, t.topicCode)}`
    ),
    overflow > 0 ? `+ ${overflow} more on your due list.` : '',
    '',
    `All of them: ${reviewUrl}`,
    '',
    `Turn off due reminders: ${unsubscribeHref}`,
    '',
    '— MarkScheme',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')

  const preheader =
    listed.length > 0
      ? `${listed[0].name} is due. One question closes it.`
      : 'A few minutes keeps your weak topics sharp.'

  sendEmailAsync({
    to,
    subject: `${n} ${n === 1 ? 'topic is' : 'topics are'} due today`,
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: { label: 'Open your due list →', href: reviewUrl },
      unsubscribe: { label: 'Turn off due reminders', href: unsubscribeHref },
    }),
    unsubscribeHref,
  })
}
