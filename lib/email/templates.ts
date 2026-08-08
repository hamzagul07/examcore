import { CONTACT_EMAIL, POSTAL_ADDRESS, SITE_HOST, SITE_NAME, SITE_URL } from '@/lib/site-config'

export type EmailContent = {
  subject: string
  text: string
  preheader?: string
}

/**
 * Shared palette for every email body. Mirrors the warm-paper design tokens the
 * app uses — kept here as literals because email clients strip CSS variables,
 * so each rule has to carry its own hex.
 */
export const EMAIL_BRAND = '#9f1239'
export const EMAIL_INK = '#1a1a1a'
export const EMAIL_BODY = '#333'
export const EMAIL_MUTED = '#8a7f70'
export const EMAIL_SURFACE = '#faf7f2'
export const EMAIL_BORDER = '#eee2d6'
export const EMAIL_HAIRLINE = '#f0ece4'
/** The ground the card sits on. Warmer than the card, so the sheet reads as paper. */
export const EMAIL_PAPER = '#f2efe9'

/**
 * Two stacks, used for different jobs.
 *
 * Serif carries everything meant to be *read* — prose, headings, the figures in
 * a stat row. Sans is reserved for the machinery around it: small-caps labels,
 * meta lines, buttons. That split is what separates an editorial page from an
 * interface, and it is the reason these stop looking like app notifications.
 *
 * Georgia leads both fallback chains because it ships on effectively every
 * client and was drawn for screens, so the serif does not degrade into
 * Times-on-Windows.
 */
export const EMAIL_SERIF = "Georgia,'Iowan Old Style','Palatino Linotype','Book Antiqua',serif"
export const EMAIL_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}

/**
 * One figure in the three-up stat row.
 *
 * `big` is inserted as HTML so callers can inject trend badges; anything
 * derived from user data must be escaped by the caller. `label` is escaped here.
 */
export function statCell(big: string, label: string, accent = EMAIL_INK): string {
  return `<td valign="top" style="width:33.33%;padding:20px 8px;text-align:center;border-top:1px solid ${EMAIL_BORDER};border-bottom:1px solid ${EMAIL_BORDER}">
      <div style="font-family:${EMAIL_SERIF};font-size:30px;font-weight:600;color:${accent};line-height:1.05;letter-spacing:-.02em">${big}</div>
      <div style="font-family:${EMAIL_SANS};font-size:10px;color:${EMAIL_MUTED};text-transform:uppercase;letter-spacing:.12em;margin-top:9px">${escapeHtml(label)}</div>
    </td>`
}

/** Heading + optional sub-line introducing a list block. */
export function sectionHeading(title: string, sub?: string): string {
  const subLine = sub
    ? `<div style="font-family:${EMAIL_SANS};font-size:13px;line-height:1.55;color:${EMAIL_MUTED};margin:0 0 14px">${escapeHtml(sub)}</div>`
    : '<div style="height:10px"></div>'
  return `<div style="font-family:${EMAIL_SERIF};font-size:20px;font-weight:600;color:${EMAIL_INK};letter-spacing:-.01em;line-height:1.3;margin:0 0 6px">${escapeHtml(title)}</div>${subLine}`
}

/**
 * A row in an "everything here is one click from being fixed" list: title on the
 * left, an action link on the right. `titleHtml`/`metaHtml` are HTML so callers
 * can bold parts of them — escape user data before passing it in.
 */
export function linkRow(opts: {
  titleHtml: string
  metaHtml?: string
  href: string
  actionLabel: string
}): string {
  const meta = opts.metaHtml
    ? `<div style="font-family:${EMAIL_SANS};font-size:12px;color:${EMAIL_MUTED};margin-top:3px">${opts.metaHtml}</div>`
    : ''
  return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid ${EMAIL_HAIRLINE}">
      ${opts.titleHtml}${meta}
    </td>
    <td align="right" style="padding:14px 0;border-bottom:1px solid ${EMAIL_HAIRLINE};white-space:nowrap">
      <a href="${escapeAttr(opts.href)}" style="font-family:${EMAIL_SANS};color:${EMAIL_BRAND};font-weight:600;text-decoration:none;font-size:13px;letter-spacing:.01em">${escapeHtml(opts.actionLabel)}</a>
    </td>
  </tr>`
}

/** Wraps `linkRow` output in the table it needs. */
export function linkRowTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px">${rows}</table>`
}

/**
 * The soft brand-tinted callout. `inner` is HTML. `label` renders as a small
 * uppercase eyebrow above it.
 */
export function calloutHtml(inner: string, label?: string): string {
  const eyebrow = label
    ? `<div style="font-family:${EMAIL_SANS};font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:${EMAIL_BRAND};font-weight:700;margin-bottom:9px">${escapeHtml(label)}</div>`
    : ''
  return `<div style="background:#fdf8f9;border-left:2px solid ${EMAIL_BRAND};padding:18px 22px;margin:0 0 26px">
    ${eyebrow}<div style="font-family:${EMAIL_SERIF};font-size:15.5px;line-height:1.65;color:${EMAIL_BODY}">${inner}</div>
  </div>`
}

/**
 * Quoted text — someone's own message read back to them, or the comment that
 * triggered a notification. Takes plain text and escapes it: every current
 * caller is passing user-generated content.
 */
export function quoteHtml(text: string): string {
  return `<div style="border-left:2px solid ${EMAIL_BORDER};padding:2px 0 2px 18px;margin:0 0 24px;font-family:${EMAIL_SERIF};font-style:italic;font-size:15px;line-height:1.65;color:#5a5248;white-space:pre-wrap">${escapeHtml(
    text
  )}</div>`
}

/** Neutral (non-brand) note box — for reassurance rather than emphasis. */
export function noteHtml(inner: string): string {
  return `<div style="border-left:2px solid ${EMAIL_BORDER};padding:3px 0 3px 18px;margin:0 0 24px;font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.65;color:#5a5248">${inner}</div>`
}

/** Numbered how-to step. Used by the welcome email's "get accurate marking" list. */
export function stepHtml(n: number, title: string, body: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr>
    <td valign="top" style="width:34px">
      <div style="font-family:${EMAIL_SERIF};font-size:19px;font-weight:600;color:${EMAIL_BRAND};line-height:1.3">${n}</div>
    </td>
    <td valign="top" style="font-family:${EMAIL_SERIF};font-size:15.5px;line-height:1.65;color:${EMAIL_BODY}">
      <strong style="color:${EMAIL_INK};font-weight:600">${escapeHtml(title)}</strong> ${body}
    </td>
  </tr></table>`
}

/** Small secondary link list rendered under the primary CTA. */
export function secondaryLinksHtml(links: { label: string; href: string }[]): string {
  if (links.length === 0) return ''
  const items = links
    .map(
      (l) =>
        `<a href="${escapeAttr(l.href)}" style="font-family:${EMAIL_SANS};color:${EMAIL_BRAND};text-decoration:none;font-weight:600;font-size:13px">${escapeHtml(l.label)}</a>`
    )
    .join(`<span style="color:${EMAIL_BORDER}"> &nbsp;·&nbsp; </span>`)
  return `<p style="margin:18px 0 0;font-size:13.5px;line-height:1.9">${items}</p>`
}

/** Muted unsubscribe / preferences footer line. */
export function unsubscribeLineHtml(label: string, href: string): string {
  return `<p style="margin:14px 0 0;font-family:${EMAIL_SANS};font-size:11.5px;color:#a39a8f"><a href="${escapeAttr(href)}" style="color:#a39a8f;text-decoration:underline">${escapeHtml(label)}</a></p>`
}

export function renderBrandedEmailHtml(payload: {
  preheader?: string
  bodyHtml: string
  cta?: { label: string; href: string }
  /** Rendered under the CTA — secondary destinations, never competing with it. */
  secondaryLinks?: { label: string; href: string }[]
  /** Rendered last, below the footer rule. Pass it rather than appending an
   * unsubscribe line to `bodyHtml`, so the opt-out cannot precede the CTA. */
  unsubscribe?: { label: string; href: string }
  /** Small-caps dateline above the body, e.g. "Weekly report". Labels the
   * email without competing with its first sentence. */
  kicker?: string
}): string {
  // The trailing zero-width joiners pad the inbox preview line. Without them the
  // client keeps reading past the preheader and appends "MarkScheme." plus the
  // first words of the body to whatever the preheader already said.
  const preheader = payload.preheader
    ? `<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(payload.preheader)}</span>` +
      `<span style="display:none;max-height:0;overflow:hidden">${'&#8204;&nbsp;'.repeat(60)}</span>`
    : ''

  const cta = payload.cta
    ? `<p style="margin:30px 0 0"><a href="${escapeAttr(payload.cta.href)}" style="display:inline-block;font-family:${EMAIL_SANS};background:${EMAIL_BRAND};color:#fff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:.02em;padding:15px 30px;border-radius:3px">${escapeHtml(payload.cta.label)}</a></p>`
    : ''

  // Both of these render *after* the CTA on purpose. Senders used to append
  // them to bodyHtml, which put "unsubscribe" immediately above the button —
  // an opt-out reading as the last word before the ask, and on a phone a live
  // tap target sitting exactly where the thumb is already travelling.
  const secondaryLinks =
    payload.secondaryLinks && payload.secondaryLinks.length > 0
      ? secondaryLinksHtml(payload.secondaryLinks)
      : ''

  const unsubscribe = payload.unsubscribe
    ? unsubscribeLineHtml(payload.unsubscribe.label, payload.unsubscribe.href)
    : ''

  // A dateline-style kicker, if the sender gave one. Small caps rather than a
  // heading: it labels the email without competing with the first sentence.
  const kicker = payload.kicker
    ? `<p style="margin:0 0 20px;font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${EMAIL_MUTED}">${escapeHtml(
        payload.kicker
      )}</p>`
    : ''

  // Only rendered when configured. An empty address line is worse than none.
  const postal = POSTAL_ADDRESS.trim()
    ? `<p style="margin:10px 0 0;font-family:${EMAIL_SANS};font-size:11.5px;line-height:1.6;color:#a39a8f">${escapeHtml(
        SITE_NAME
      )} &middot; ${escapeHtml(POSTAL_ADDRESS.trim())}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:${EMAIL_PAPER};font-family:${EMAIL_SERIF};color:${EMAIL_INK}">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_PAPER};padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid ${EMAIL_BORDER};border-radius:4px">

<!-- Masthead rule. A 3px brand edge is what separates a letterhead from a card;
     it also survives every client, unlike a background image or a logo file. -->
<tr><td style="height:3px;background:${EMAIL_BRAND};font-size:0;line-height:0;border-radius:3px 3px 0 0">&nbsp;</td></tr>

<tr><td style="padding:30px 34px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="font-family:${EMAIL_SERIF};font-size:24px;font-weight:600;letter-spacing:-.015em;color:${EMAIL_INK}">
        ${escapeHtml(SITE_NAME)}<span style="color:${EMAIL_BRAND}">.</span>
      </td>
      <td align="right" style="font-family:${EMAIL_SANS};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${EMAIL_MUTED}">
        Examiner-style marking
      </td>
    </tr>
  </table>
  <div style="height:1px;background:${EMAIL_BORDER};margin:16px 0 24px;font-size:0;line-height:0">&nbsp;</div>
</td></tr>

<tr><td style="padding:0 34px 32px;font-family:${EMAIL_SERIF};font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">
${kicker}${payload.bodyHtml}
${cta}
${secondaryLinks}
<div style="height:1px;background:${EMAIL_BORDER};margin:30px 0 0;font-size:0;line-height:0">&nbsp;</div>
<p style="margin:20px 0 0;font-family:${EMAIL_SANS};font-size:12.5px;line-height:1.6;color:#7d746a">
Questions? Reply to this email or write to <a href="mailto:${escapeAttr(CONTACT_EMAIL)}" style="color:${EMAIL_BRAND};text-decoration:none;border-bottom:1px solid #e3cdd3">${escapeHtml(CONTACT_EMAIL)}</a>.
</p>
${postal}
${unsubscribe}
</td></tr>
</table>
<p style="margin:18px 0 0;font-size:11.5px;letter-spacing:.04em;color:#9a9186;font-family:system-ui,-apple-system,sans-serif"><a href="${escapeAttr(SITE_URL)}" style="color:#9a9186;text-decoration:none">${escapeHtml(SITE_HOST)}</a></p>
</td></tr>
</table>
</body></html>`
}

/**
 * Matches a bare URL and stops before trailing sentence punctuation, so
 * "Open your dashboard: https://x/y." links `https://x/y` and leaves the stop.
 */
const BARE_URL_RE = /https?:\/\/[^\s<]*[^\s<.,;:!?)\]]/g

export function textToHtmlParagraphs(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<br>'
      return `<p style="margin:0 0 12px">${linkify(escapeHtml(trimmed))}</p>`
    })
    .join('')
}

/**
 * Prose written as blank-line-separated paragraphs.
 *
 * Distinct from `textToHtmlParagraphs`, which treats every newline as its own
 * paragraph and a blank line as an extra <br> — right for the admin alerts,
 * which are lists of one-line facts that need blocks pulled apart, but on real
 * prose it doubles the gap between paragraphs. Campaign and newsletter copy is
 * written the way anyone writes an email, so it is split on blank lines and the
 * paragraph margin alone does the spacing.
 */
export function textToProseParagraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map(
      (para) =>
        `<p style="margin:0 0 17px;font-family:${EMAIL_SERIF};font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">${linkify(
          escapeHtml(para).replace(/\n/g, '<br>')
        )}</p>`
    )
    .join('')
}

/**
 * Turns bare URLs in already-escaped text into anchors. Without this, the
 * plain-text fallback renders links as dead text in any client that doesn't
 * auto-detect them.
 */
function linkify(escaped: string): string {
  return escaped.replace(
    BARE_URL_RE,
    (url) => `<a href="${url}" style="color:${EMAIL_BRAND}">${url}</a>`
  )
}
