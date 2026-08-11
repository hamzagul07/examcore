import {
  EMAIL_BRAND,
  EMAIL_BORDER,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SANS,
  EMAIL_SERIF,
  EMAIL_SURFACE,
} from '@/lib/email/templates'

export type StripBand = { grade: string; at: number }

/**
 * The grade ladder for one paper, drawn as a single track.
 *
 * The five thresholds are five points on one 0–100 scale, so they belong on one
 * axis rather than in five separate bars — and drawn that way the actual point
 * makes itself: the middle bands are eight to ten marks wide. "A couple of
 * marks matters" is an assertion in prose and self-evident in a picture.
 *
 * Every band carries the same fill. Width is the encoding here — how much room
 * a grade occupies — and a second encoding in colour would only invite the
 * reader to decode a meaning that is not there. Bands are separated by a 2px
 * surface gap rather than by hue, which also survives every email client and
 * both colour schemes.
 *
 * Built from table cells with inline styles and no images: Outlook does not do
 * SVG, and images are blocked by default in enough clients that a visual which
 * depends on them is a visual most people never see.
 */
export function thresholdStripHtml(opts: {
  caption: string
  max: number
  bands: StripBand[]
}): string {
  const sorted = [...opts.bands].filter((b) => Number.isFinite(b.at)).sort((a, b) => a.at - b.at)
  if (!sorted.length) return ''

  // Each band spans from its own threshold to the next one up; the top grade
  // runs to full marks. The stretch below the lowest threshold is drawn unfilled
  // because no grade is awarded there.
  const segments = sorted.map((band, i) => {
    const upper = i === sorted.length - 1 ? opts.max : sorted[i + 1].at
    return { grade: band.grade, at: band.at, width: ((upper - band.at) / opts.max) * 100 }
  })
  const belowWidth = (sorted[0].at / opts.max) * 100

  const cell = (widthPct: number, filled: boolean) =>
    `<td width="${widthPct.toFixed(2)}%" style="width:${widthPct.toFixed(2)}%;height:34px;background:${
      filled ? EMAIL_BRAND : '#ffffff'
    };border:${filled ? 'none' : `1px solid ${EMAIL_BORDER}`};border-radius:3px;font-size:0;line-height:0">&nbsp;</td>`

  const gap = `<td width="2" style="width:2px;font-size:0;line-height:0">&nbsp;</td>`

  const bar =
    cell(belowWidth, false) +
    segments.map((s) => gap + cell(s.width, true)).join('')

  // Labels sit under their own band so the number is read against the thing it
  // marks, rather than in a legend the reader has to hold in their head.
  const labelCell = (widthPct: number, text: string, muted: boolean) =>
    `<td width="${widthPct.toFixed(2)}%" style="width:${widthPct.toFixed(
      2
    )}%;padding-top:6px;font-family:${EMAIL_SANS};font-size:11px;line-height:1.3;color:${
      muted ? EMAIL_MUTED : EMAIL_INK
    };text-align:left;white-space:nowrap">${text}</td>`

  const labels =
    labelCell(belowWidth, '', true) +
    segments.map((s) => `<td width="2">&nbsp;</td>` + labelCell(s.width, `<strong>${s.grade}</strong> ${s.at}`, false)).join('')

  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:4px 0 20px;background:${EMAIL_SURFACE};border:1px solid ${EMAIL_BORDER};border-radius:6px;padding:14px 16px">`,
    '<tr><td>',
    `<div style="font-family:${EMAIL_SERIF};font-size:14px;font-weight:600;color:${EMAIL_INK};margin:0 0 10px">${opts.caption}</div>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;table-layout:fixed">',
    `<tr>${bar}</tr>`,
    `<tr>${labels}</tr>`,
    '</table>',
    `<div style="font-family:${EMAIL_SANS};font-size:11.5px;color:${EMAIL_MUTED};margin-top:10px">Each block is one grade. The middle bands are eight to ten marks wide.</div>`,
    '</td></tr></table>',
  ].join('')
}

/** Same information for the plain-text part, where there is no picture at all. */
export function thresholdStripText(opts: { caption: string; max: number; bands: StripBand[] }): string {
  const sorted = [...opts.bands].filter((b) => Number.isFinite(b.at)).sort((a, b) => b.at - a.at)
  return [
    opts.caption,
    ...sorted.map((b) => `  ${b.grade}  ${b.at}/${opts.max}`),
    '  The middle bands are eight to ten marks wide.',
  ].join('\n')
}
