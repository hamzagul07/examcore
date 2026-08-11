import { sendEmail } from '@/lib/email/send'
import {
  EMAIL_INK,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  textToProseParagraphs,
} from '@/lib/email/templates'

/**
 * A broadcast campaign rendered through the same shell as everything else.
 *
 * The body is authored as plain text with blank-line paragraphs, so a campaign
 * can be proof-read in a terminal and diffed in git rather than existing only
 * as HTML in a database column. `textToProseParagraphs` escapes it and linkifies
 * bare URLs, which also means campaign copy cannot inject markup by accident.
 *
 * Sent with `sendEmail`, not `sendEmailAsync`: a campaign runs from a script
 * that must know whether each send succeeded before recording it. Firing and
 * forgetting would let campaign_sends claim deliveries that never happened.
 */
/** Split on the first occurrence only; a second marker stays as literal text. */
function splitOnce(text: string, marker: string): [string, string | null] {
  const at = text.indexOf(marker)
  if (at === -1) return [text, null]
  return [text.slice(0, at).trimEnd(), text.slice(at + marker.length).trimStart()]
}

export async function sendBroadcastEmail(payload: {
  to: string
  recipientName?: string | null
  subject: string
  preheader?: string | null
  /** Plain text, blank line between paragraphs. */
  body: string
  /**
   * Optional block dropped where the body says {{visual}}.
   *
   * A marker rather than raw HTML in the body: campaign copy is authored as
   * plain text and escaped on the way out, which is what keeps a campaign from
   * being an HTML injection point. This lets a campaign place a known visual
   * without being able to write markup.
   */
  visual?: { html: string; text: string }
  cta?: { label: string; href: string } | null
  unsubscribeHref: string
  unsubscribeLabel: string
}): Promise<boolean> {
  const greeting = payload.recipientName?.trim()
    ? `Hi ${payload.recipientName.trim()},`
    : 'Hi,'

  const preheader = payload.preheader?.trim() || undefined

  const MARKER = '{{visual}}'
  const [beforeVisual, afterVisual] = payload.visual
    ? splitOnce(payload.body, MARKER)
    : [payload.body.replaceAll(MARKER, ''), null]

  const bodyHtml =
    `<p style="margin:0 0 16px;font-size:16px;color:${EMAIL_INK}">${esc(greeting)}</p>` +
    textToProseParagraphs(beforeVisual) +
    (payload.visual && afterVisual !== null ? payload.visual.html : '') +
    (afterVisual !== null ? textToProseParagraphs(afterVisual) : '')

  const text = [
    greeting,
    '',
    // The picture is data, so the text part gets the same data as a list rather
    // than a hole where a visual used to be.
    payload.visual && afterVisual !== null
      ? `${beforeVisual}\n\n${payload.visual.text}\n\n${afterVisual}`
      : beforeVisual,
    ...(payload.cta ? ['', `${payload.cta.label}: ${payload.cta.href}`] : []),
    '',
    `${payload.unsubscribeLabel}: ${payload.unsubscribeHref}`,
    '',
    '— MarkScheme',
  ].join('\n')

  return sendEmail({
    to: payload.to,
    subject: payload.subject,
    preheader,
    text,
    html: renderBrandedEmailHtml({
      preheader,
      bodyHtml,
      cta: payload.cta ?? undefined,
      unsubscribe: { label: payload.unsubscribeLabel, href: payload.unsubscribeHref },
    }),
    unsubscribeHref: payload.unsubscribeHref,
  })
}
