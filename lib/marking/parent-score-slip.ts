/**
 * One-page parent/tutor artefact — the shareable “proof of effort” slip.
 * Opens in a print window; student shows parent without needing an account.
 */

export type ParentScoreSlipMark = {
  label: string
  earned: boolean
  reason?: string | null
}

export type ParentScoreSlipInput = {
  marksEarned: number
  totalMarks: number
  percentage: number
  bandLabel: string
  grade?: string | null
  nextGrade?: { marksNeeded: number; nextGrade: string } | null
  subjectLabel?: string | null
  paperRef?: string | null
  topics?: string[]
  marks?: ParentScoreSlipMark[]
  /** Short examiner summary — shown on the full report page, not the WA teaser. */
  summary?: string | null
  /** Public report URL — preferred share target over bare /mark. */
  shareUrl?: string | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildParentScoreSlipText(input: ParentScoreSlipInput): string {
  const lines = [
    "MarkScheme · Examiner's Ink",
    input.subjectLabel ? `Subject: ${input.subjectLabel}` : null,
    input.paperRef ? `Paper: ${input.paperRef}` : null,
    `${input.marksEarned} / ${input.totalMarks} · ${input.percentage}% · ${input.bandLabel}`,
    input.grade ? `Predicted grade: ${input.grade}` : null,
    input.nextGrade && input.nextGrade.marksNeeded > 0
      ? `${input.nextGrade.marksNeeded} mark${input.nextGrade.marksNeeded === 1 ? '' : 's'} from ${input.nextGrade.nextGrade}`
      : null,
  ].filter(Boolean) as string[]

  const lost = (input.marks ?? []).filter((m) => !m.earned)
  if (lost.length) {
    lines.push('', 'Marks still to earn:')
    for (const m of lost.slice(0, 6)) {
      lines.push(`· ${m.label}${m.reason ? ` — ${m.reason}` : ''}`)
    }
  }

  if (input.topics?.length) {
    lines.push('', `Topics: ${input.topics.slice(0, 5).join(', ')}`)
  }

  const reportUrl =
    input.shareUrl?.trim() || 'https://markscheme.app/mark'
  lines.push('', 'Full report:', reportUrl)
  return lines.join('\n')
}

/** Opens WhatsApp with the parent slip text prefilled (mobile + desktop WA web). */
export function shareParentScoreSlipWhatsApp(input: ParentScoreSlipInput): void {
  if (typeof window === 'undefined') return
  const text = buildParentScoreSlipText(input)
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * System share sheet when available (iOS/Android). Returns false if the
 * browser has no share API or the user dismissed it without sharing.
 */
export async function shareParentScoreSlipNative(
  input: ParentScoreSlipInput,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  const text = buildParentScoreSlipText(input)
  const shareUrl = input.shareUrl?.trim() || 'https://markscheme.app/mark'
  try {
    await navigator.share({
      title: "MarkScheme · Examiner's Ink",
      text,
      url: shareUrl,
    })
    return true
  } catch {
    return false
  }
}

/** Print-ready HTML for the parent report (also used by the public /r page). */
export function buildParentScoreSlipHtml(input: ParentScoreSlipInput): string {
  const lost = (input.marks ?? []).filter((m) => !m.earned).slice(0, 8)
  const earned = (input.marks ?? []).filter((m) => m.earned).length
  const topics = (input.topics ?? []).slice(0, 6)
  const summary = input.summary?.trim()

  const lostRows = lost.length
    ? `<section class="block">
        <h2>Where marks got away</h2>
        <ul>${lost
          .map(
            (m) =>
              `<li><span class="stamp lost">${esc(m.label)}</span> ${
                m.reason ? `<span class="why">${esc(m.reason)}</span>` : ''
              }</li>`,
          )
          .join('')}</ul>
      </section>`
    : `<section class="block"><p class="ok">Every mark point earned on this attempt.</p></section>`

  const earnedRows =
    earned > 0
      ? `<section class="block">
        <h2>Marks earned</h2>
        <ul>${(input.marks ?? [])
          .filter((m) => m.earned)
          .slice(0, 12)
          .map(
            (m) =>
              `<li><span class="stamp okstamp">${esc(m.label)}</span> earned</li>`,
          )
          .join('')}</ul>
      </section>`
      : ''

  const topicChips = topics.length
    ? `<section class="block"><h2>Topics touched</h2><div class="chips">${topics
        .map((t) => `<span class="chip">${esc(t)}</span>`)
        .join('')}</div></section>`
    : ''

  const summaryBlock = summary
    ? `<section class="block"><h2>Examiner note</h2><p class="summary">${esc(summary)}</p></section>`
    : ''

  const nextLine =
    input.nextGrade && input.nextGrade.marksNeeded > 0
      ? `<p class="next"><strong>${input.nextGrade.marksNeeded}</strong> mark${
          input.nextGrade.marksNeeded === 1 ? '' : 's'
        } from ${esc(input.nextGrade.nextGrade)}</p>`
      : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>MarkScheme · Parent score slip</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px 20px;
    font-family: Georgia, 'Times New Roman', serif;
    color: #25221b; background: #faf9f6;
  }
  .slip {
    max-width: 440px; margin: 0 auto; padding: 28px 26px 24px;
    background: #fff; border: 1.5px solid #e3dac6;
    box-shadow: 6px 6px 0 rgba(37,34,27,0.1);
  }
  .eyebrow {
    display: inline-block; font-family: ui-monospace, Menlo, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: #19774d;
    border: 1.5px solid rgba(30,138,94,0.4);
    background: rgba(25,119,77,0.07); padding: 5px 9px; margin-bottom: 14px;
  }
  h1 { font-size: 24px; margin: 0 0 4px; font-weight: 600; letter-spacing: -0.02em; }
  .meta { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #5c6470; margin: 0 0 16px; }
  .score {
    font-size: 40px; font-weight: 700; color: #19774d; line-height: 1;
    margin: 8px 0 6px; letter-spacing: -0.02em;
  }
  .band { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
  .pct { font-size: 14px; color: #5c6470; margin: 0 0 10px; }
  .next { font-size: 14px; margin: 10px 0 0; padding: 8px 10px;
    background: rgba(25,119,77,0.07); border: 1px solid rgba(30,138,94,0.28); }
  .block { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e3dac6; }
  .block h2 {
    font-family: ui-monospace, Menlo, monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; color: #19774d;
    margin: 0 0 10px; font-weight: 700;
  }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  li { font-size: 13.5px; line-height: 1.4; }
  .stamp {
    display: inline-block; font-family: ui-monospace, Menlo, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
    padding: 2px 6px; border: 1px solid; margin-right: 6px;
  }
  .stamp.lost { color: #a23e3e; border-color: rgba(162,62,62,0.45); background: rgba(176,72,72,0.08); }
  .stamp.okstamp { color: #19774d; border-color: rgba(30,138,94,0.45); background: rgba(25,119,77,0.08); }
  .why { color: #5c6470; }
  .summary { margin: 0; font-size: 14px; line-height: 1.5; color: #25221b; }
  .ok { margin: 0; font-size: 14px; color: #19774d; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font-family: ui-monospace, Menlo, monospace; font-size: 11px;
    padding: 4px 8px; border: 1px solid #e3dac6; background: #faf9f6;
  }
  .foot {
    margin-top: 22px; padding-top: 14px; border-top: 1px solid #e3dac6;
    font-size: 12px; color: #8d8470; line-height: 1.5;
  }
  .foot strong { color: #25221b; }
  .stats { display: flex; gap: 16px; margin-top: 12px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #5c6470; }
</style>
</head>
<body>
  <article class="slip">
    <div class="eyebrow">Examiner's Ink · parent report</div>
    <h1>Effort on the page</h1>
    <p class="meta">
      ${input.subjectLabel ? esc(input.subjectLabel) : 'Marked attempt'}
      ${input.paperRef ? ` · ${esc(input.paperRef)}` : ''}
    </p>
    <p class="score">${input.marksEarned}<span style="font-size:22px;color:#5c6470"> / ${input.totalMarks}</span></p>
    <p class="band">${esc(input.bandLabel)}</p>
    <p class="pct">${input.percentage}%${input.grade ? ` · predicted ${esc(input.grade)}` : ''}</p>
    ${nextLine}
    <div class="stats">
      <span>${earned} earned</span>
      <span>${lost.length} missed</span>
    </div>
    ${summaryBlock}
    ${lostRows}
    ${earnedRows}
    ${topicChips}
    <p class="foot">
      Your student marked this on <strong>MarkScheme</strong> — examiner-style
      feedback against the scheme. Open the link anytime — no account needed.
      <br/>markscheme.app
    </p>
  </article>
</body>
</html>`
}

/** Opens a print-ready parent report window. */
export function openParentScoreSlip(input: ParentScoreSlipInput): void {
  if (typeof window === 'undefined') return

  // Prefer the durable public report URL when we have one.
  if (input.shareUrl?.trim()) {
    window.open(input.shareUrl.trim(), '_blank', 'noopener,noreferrer')
    return
  }

  const html = buildParentScoreSlipHtml(input)
  const win = window.open('', '_blank', 'noopener,noreferrer,width=520,height=720')
  if (!win) return
  win.document.write(
    html.replace(
      '</body>',
      '<script>window.onload=function(){window.focus();window.print()}<\/script></body>',
    ),
  )
  win.document.close()
}
