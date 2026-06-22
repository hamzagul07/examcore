import { SITE_URL } from '@/lib/site-config'
import { sendEmailAsync } from '@/lib/email/send'
import { renderBrandedEmailHtml, textToHtmlParagraphs } from '@/lib/email/templates'

export function sendCommunityReplyEmail(payload: {
  to: string
  recipientName?: string | null
  actorUsername: string
  kind: 'comment' | 'reply'
  postTitle: string
  postHref: string
  preview?: string
  unsubscribeHref?: string
}): void {
  const greeting = payload.recipientName?.trim() || 'there'
  const action =
    payload.kind === 'reply'
      ? `${payload.actorUsername} replied to your comment`
      : `${payload.actorUsername} commented on your post`

  const text = [
    `Hi ${greeting},`,
    '',
    `${action} in Exam Room:`,
    `"${payload.postTitle}"`,
    payload.preview ? `\n"${payload.preview.slice(0, 180)}${payload.preview.length > 180 ? '…' : ''}"` : '',
    '',
    `View the thread: ${payload.postHref}`,
    '',
    payload.unsubscribeHref
      ? `Unsubscribe from reply emails: ${payload.unsubscribeHref}`
      : 'You can turn off reply emails in Account → Preferences.',
    '',
    '— MarkScheme Exam Room',
  ]
    .filter(Boolean)
    .join('\n')

  sendEmailAsync({
    to: payload.to,
    subject:
      payload.kind === 'reply'
        ? `${payload.actorUsername} replied in Exam Room`
        : `New comment on "${payload.postTitle.slice(0, 48)}${payload.postTitle.length > 48 ? '…' : ''}"`,
    preheader: action,
    text,
    cta: { label: 'View discussion', href: payload.postHref },
    html: renderBrandedEmailHtml({
      preheader: action,
      bodyHtml: textToHtmlParagraphs(text),
      cta: { label: 'View discussion', href: payload.postHref },
    }),
  })
}

export function sendCommunityDigestEmail(payload: {
  to: string
  recipientName?: string | null
  posts: { title: string; href: string; score: number; commentCount: number; subjectCode: string }[]
  unsubscribeHref?: string
}): void {
  if (!payload.posts.length) return

  const greeting = payload.recipientName?.trim() || 'there'
  const lines = [
    `Hi ${greeting},`,
    '',
    'Here are trending discussions in Exam Room this week:',
    '',
    ...payload.posts.map(
      (p, i) =>
        `${i + 1}. ${p.title} (s/${p.subjectCode} · ${p.score} pts · ${p.commentCount} comments)\n   ${p.href}`
    ),
    '',
    `Browse all rooms: ${SITE_URL}/community`,
    '',
    payload.unsubscribeHref
      ? `Unsubscribe from weekly digest: ${payload.unsubscribeHref}`
      : 'You can turn off this digest in Account → Preferences.',
    '',
    '— MarkScheme Exam Room',
  ]

  const text = lines.join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: 'Trending in Exam Room this week',
    preheader: payload.posts[0]?.title ?? 'Hot discussions from your subjects',
    text,
    cta: { label: 'Open Exam Room', href: `${SITE_URL}/community` },
    html: renderBrandedEmailHtml({
      preheader: 'Hot discussions from Exam Room',
      bodyHtml: textToHtmlParagraphs(text),
      cta: { label: 'Open Exam Room', href: `${SITE_URL}/community` },
    }),
  })
}
