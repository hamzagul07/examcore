import { sendEmailAsync } from '@/lib/email/send'
import { SITE_URL } from '@/lib/site-config'

export type ReviewDigestTopic = { name: string; subjectLabel: string }

/**
 * "Topics due for review" re-engagement email. Fire-and-forget. Always include
 * the one-click unsubscribe link (kind 'review').
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
  const noun = n === 1 ? 'topic is' : 'topics are'
  const reviewUrl = `${SITE_URL}/dashboard/review`

  const list = topics
    .slice(0, 5)
    .map((t) => `• ${t.name} (${t.subjectLabel})`)
    .join('\n')

  const text = [
    `Hi ${greeting},`,
    '',
    `${n} ${noun} due for review — a few minutes now keeps your weak topics sharp before they slip.`,
    '',
    list,
    '',
    `Review them: ${reviewUrl}`,
    '',
    `Unsubscribe from review reminders: ${unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  sendEmailAsync({
    to,
    subject: `${n} ${n === 1 ? 'topic' : 'topics'} due for review`,
    preheader: 'A few minutes keeps your weak topics sharp.',
    text,
    cta: { label: 'Review now', href: reviewUrl },
  })
}
