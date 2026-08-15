import {
  EMAIL_BORDER,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  EMAIL_SURFACE,
} from '@/lib/email/templates'

export type BreakdownPoint = {
  /** The scheme's own code for the mark: B1, M1, A1, C1. */
  code: string
  /** What the mark is for, in the scheme's words, trimmed to fit a line. */
  detail: string
  awarded: boolean
}

/**
 * One question's marks, shown the way the result page shows them.
 *
 * The campaign copy claims marking comes back "broken down point by point
 * against the published mark scheme, not a general impression". That sentence
 * asks to be believed. The same thing drawn — four award points, three ticked,
 * one not, and the one that is not carrying the reason — is checked instead,
 * and it takes about two seconds rather than a paragraph.
 *
 * The withheld mark is the load-bearing row. A picture in which everything is
 * awarded shows a generous tool; the point being made is that it says no, with a
 * reason, which is the only version worth trusting.
 *
 * Table cells and inline styles, no images and no SVG: Outlook does not render
 * SVG, and images are blocked by default in enough clients that a visual which
 * depends on them is one most people never see.
 */
export function markBreakdownHtml(opts: {
  caption: string
  question: string
  points: BreakdownPoint[]
}): string {
  const awarded = opts.points.filter((p) => p.awarded).length
  const total = opts.points.length

  const row = (p: BreakdownPoint) => {
    // A tick and a cross rather than colour alone: a red/green pair is invisible
    // to a good share of readers, and colour is stripped or inverted by enough
    // clients that it cannot be the only thing carrying the meaning.
    const mark = p.awarded ? '✓' : '✗'
    const ink = p.awarded ? EMAIL_INK : EMAIL_BRAND
    return `<tr>
<td style="padding:5px 8px 5px 0;font:600 15px ${EMAIL_SANS};color:${ink};width:18px;vertical-align:top">${mark}</td>
<td style="padding:5px 10px 5px 0;font:600 12px ${EMAIL_SANS};color:${EMAIL_MUTED};width:26px;vertical-align:top;letter-spacing:.03em">${escapeCell(p.code)}</td>
<td style="padding:5px 0;font:14px/1.4 ${EMAIL_SANS};color:${ink};vertical-align:top">${escapeCell(p.detail)}</td>
<td style="padding:5px 0 5px 10px;font:600 13px ${EMAIL_SANS};color:${ink};text-align:right;white-space:nowrap;vertical-align:top">${p.awarded ? '1' : '0'}</td>
</tr>`
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;border:1px solid ${EMAIL_BORDER};border-radius:8px;background:${EMAIL_SURFACE}">
<tr><td style="padding:16px 18px 12px">
<div style="font:13px ${EMAIL_SANS};color:${EMAIL_MUTED};margin:0 0 8px">${escapeCell(opts.caption)}</div>
<div style="font:italic 16px/1.4 ${EMAIL_SERIF};color:${EMAIL_INK};margin:0 0 12px">${escapeCell(opts.question)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${opts.points.map(row).join('')}</table>
<div style="border-top:1px solid ${EMAIL_BORDER};margin:12px 0 0;padding:10px 0 0;font:600 14px ${EMAIL_SANS};color:${EMAIL_INK};text-align:right">${awarded} out of ${total}</div>
</td></tr>
</table>`
}

/** The text part gets the same rows, not a note saying a picture is missing. */
export function markBreakdownText(opts: {
  caption: string
  question: string
  points: BreakdownPoint[]
}): string {
  const awarded = opts.points.filter((p) => p.awarded).length
  return [
    opts.caption,
    opts.question,
    ...opts.points.map(
      (p) => `  [${p.awarded ? 'x' : ' '}] ${p.code}  ${p.detail}  ${p.awarded ? 1 : 0}`
    ),
    `  ${awarded} out of ${opts.points.length}`,
  ].join('\n')
}

/**
 * Escape for a table cell. The strings here are authored in this repo rather
 * than supplied by a user, but campaign copy is escaped on the way out for the
 * same reason and a visual should not be the one hole in that.
 */
function escapeCell(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
