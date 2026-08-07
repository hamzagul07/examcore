import { SITE_URL } from '@/lib/site-config'
import { sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_INK,
  EMAIL_MUTED,
  escapeHtml as esc,
  linkRow,
  linkRowTable,
  quoteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
} from '@/lib/email/templates'

/**
 * Exam Room notification emails.
 *
 * Everything interpolated here — usernames, post titles, comment previews — is
 * written by other students, so it is escaped at every insertion point rather
 * than trusted. (The previous versions got this for free by routing through
 * textToHtmlParagraphs; building real markup means doing it deliberately.)
 */

const PREVIEW_LIMIT = 240

function truncate(value: string, limit: number): string {
  const trimmed = value.trim()
  return trimmed.length > limit ? `${trimmed.slice(0, limit).trimEnd()}…` : trimmed
}

/** Fills the shell's unsubscribe slot, which renders below the footer rule. */
function unsubscribeSlot(kind: string, href: string): { label: string; href: string } {
  return { label: `Unsubscribe from ${kind}`, href }
}

function unsubscribeTextLine(kind: string, href: string): string {
  return `Unsubscribe from ${kind}: ${href}`
}

export function sendCommunityReplyEmail(payload: {
  to: string
  recipientName?: string | null
  actorUsername: string
  kind: 'comment' | 'reply' | 'mention' | 'thread'
  postTitle: string
  postHref: string
  preview?: string
  unsubscribeHref: string
}): void {
  const greeting = payload.recipientName?.trim() || 'there'
  const action =
    payload.kind === 'reply'
      ? `${payload.actorUsername} replied to your comment`
      : payload.kind === 'mention'
        ? `${payload.actorUsername} mentioned you in Exam Room`
        : payload.kind === 'thread'
          ? `${payload.actorUsername} commented in your thread`
          : `${payload.actorUsername} commented on your post`

  const preview = payload.preview ? truncate(payload.preview, PREVIEW_LIMIT) : ''

  // Reads as one sentence with the post title in it, so the phrase carries its
  // own preposition.
  const phrase =
    payload.kind === 'reply'
      ? 'replied to your comment on'
      : payload.kind === 'mention'
        ? 'mentioned you in'
        : payload.kind === 'thread'
          ? 'commented in your thread'
          : 'commented on your post'

  // The reply itself is the reason to open the email — leading with it (rather
  // than with "you have a notification") is what makes it worth sending.
  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555"><strong style="color:${EMAIL_INK}">${esc(
      payload.actorUsername
    )}</strong> ${phrase} <strong style="color:${EMAIL_INK}">${esc(
      payload.postTitle
    )}</strong>.</p>` +
    (preview ? quoteHtml(preview) : '')

  const text = [
    `Hi ${greeting},`,
    '',
    `${action} in Exam Room:`,
    `"${payload.postTitle}"`,
    preview ? '' : null,
    preview ? preview.replace(/^/gm, '> ') : null,
    '',
    `View the thread: ${payload.postHref}`,
    '',
    unsubscribeTextLine('reply emails', payload.unsubscribeHref),
    '',
    '— MarkScheme Exam Room',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  sendEmailAsync({
    to: payload.to,
    subject:
      payload.kind === 'reply'
        ? `${payload.actorUsername} replied in Exam Room`
        : payload.kind === 'mention'
          ? `${payload.actorUsername} mentioned you in Exam Room`
          : payload.kind === 'thread'
            ? `New activity on your post in Exam Room`
            : `New comment on "${truncate(payload.postTitle, 48)}"`,
    // Preheader carries the actual words, so the inbox row is readable without
    // opening anything.
    preheader: preview || action,
    text,
    html: renderBrandedEmailHtml({
      preheader: preview || action,
      bodyHtml,
      cta: { label: 'View discussion →', href: payload.postHref },
      unsubscribe: unsubscribeSlot('reply emails', payload.unsubscribeHref),
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}

export function sendCommunityMilestoneEmail(payload: {
  to: string
  recipientName?: string | null
  postTitle: string
  score: number
  postHref: string
  unsubscribeHref: string
}): void {
  const greeting = payload.recipientName?.trim() || 'there'

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<div style="text-align:center;margin:0 0 18px">
      <div style="font-size:40px;font-weight:800;color:${EMAIL_INK};line-height:1">${payload.score}</div>
      <div style="font-size:11px;color:${EMAIL_MUTED};text-transform:uppercase;letter-spacing:.06em;margin-top:6px">upvotes</div>
    </div>` +
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">Your post <strong style="color:${EMAIL_INK}">${esc(
      payload.postTitle
    )}</strong> is being read across Exam Room. Answering the replies is usually what keeps it near the top — and explaining something is the fastest way to find out whether you actually know it.</p>`

  const text = [
    `Hi ${greeting},`,
    '',
    `Your post in Exam Room hit ${payload.score} upvotes:`,
    `"${payload.postTitle}"`,
    '',
    'Answering the replies keeps it near the top — and explaining something is the fastest way to find out whether you actually know it.',
    '',
    `View the post: ${payload.postHref}`,
    '',
    unsubscribeTextLine('activity emails', payload.unsubscribeHref),
    '',
    '— MarkScheme Exam Room',
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: `Your post reached ${payload.score} upvotes`,
    preheader: `"${truncate(payload.postTitle, 60)}" is trending`,
    text,
    html: renderBrandedEmailHtml({
      preheader: `"${truncate(payload.postTitle, 60)}" is trending`,
      bodyHtml,
      cta: { label: 'View post →', href: payload.postHref },
      unsubscribe: unsubscribeSlot('activity emails', payload.unsubscribeHref),
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}

export function sendCommunityDigestEmail(payload: {
  to: string
  recipientName?: string | null
  posts: { title: string; href: string; score: number; commentCount: number; subjectCode: string }[]
  unsubscribeHref: string
}): void {
  if (!payload.posts.length) return

  const greeting = payload.recipientName?.trim() || 'there'

  const rows = payload.posts
    .map((p) =>
      linkRow({
        titleHtml: `<span style="font-size:15px;font-weight:600;color:${EMAIL_INK}">${esc(
          p.title
        )}</span>`,
        metaHtml: `s/${esc(p.subjectCode)} · ${p.score} ${
          p.score === 1 ? 'point' : 'points'
        } · ${p.commentCount} ${p.commentCount === 1 ? 'comment' : 'comments'}`,
        href: p.href,
        actionLabel: 'Read →',
      })
    )
    .join('')

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(greeting)},</p>` +
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">The questions your subjects argued about this week. Reading how someone else got stuck on a topic is often faster than revising it alone.</p>` +
    sectionHeading('Trending in Exam Room') +
    linkRowTable(rows)

  const text = [
    `Hi ${greeting},`,
    '',
    'The questions your subjects argued about this week:',
    '',
    ...payload.posts.map(
      (p, i) =>
        `${i + 1}. ${p.title} (s/${p.subjectCode} · ${p.score} pts · ${p.commentCount} ${
          p.commentCount === 1 ? 'comment' : 'comments'
        })\n   ${p.href}`
    ),
    '',
    `Browse all rooms: ${SITE_URL}/community`,
    '',
    unsubscribeTextLine('the weekly digest', payload.unsubscribeHref),
    '',
    '— MarkScheme Exam Room',
  ].join('\n')

  sendEmailAsync({
    to: payload.to,
    subject: 'Trending in Exam Room this week',
    preheader: truncate(payload.posts[0]?.title ?? 'Hot discussions from your subjects', 80),
    text,
    html: renderBrandedEmailHtml({
      preheader: truncate(payload.posts[0]?.title ?? 'Hot discussions from your subjects', 80),
      bodyHtml,
      cta: { label: 'Open Exam Room →', href: `${SITE_URL}/community` },
      unsubscribe: unsubscribeSlot('the weekly digest', payload.unsubscribeHref),
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}
