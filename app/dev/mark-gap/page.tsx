import { ExaminerInkPerPage } from '@/components/examiner-ink/ExaminerInkPerPage'
import { MarkGapPanel } from '@/components/examiner-ink/MarkGapPanel'
import { buildPerPageInk, type PageInkSource } from '@/lib/marking/ink-per-page'
import { buildMarkGap, inlineGhostFixes } from '@/lib/marking/mark-gap'
import type { MarkingAIResult } from '@/lib/marking/types'

export const metadata = {
  title: 'Mark Gap preview — dev',
  robots: { index: false, follow: false },
}

/**
 * Dev preview for the Mark Gap overlay. Renders the REAL components against a
 * fabricated marked attempt — a handwritten "script" (data-URI SVG) whose OCR
 * boxes line up with the marks, so the earned ticks anchor and the missed A1
 * draws its ghost insertion in place. No auth, no DB, no model call.
 */

const LAW = "Newton's 2nd law:  force = mass × acceleration"
const SUB = 'F = 2.0 × 3.0'
const ANS = 'F = 6.0'

// OCR boxes (percent of image). Marks match to these by line_reference text.
const OCR: PageInkSource['ocr_lines'] = [
  { text: LAW, bbox: { top: 12, left: 9, width: 70, height: 6 } },
  { text: SUB, bbox: { top: 40, left: 9, width: 26, height: 6 } },
  { text: ANS, bbox: { top: 54, left: 9, width: 16, height: 6 } },
]

const aiMarking = {
  marks_earned: 2,
  total_marks: 4,
  summary: '',
  weak_topics: [],
  what_to_study_next: '',
  marking_style: 'point_based',
  marks_awarded: [
    {
      mark_id: 1,
      type: 'B1',
      earned: true,
      reasoning: "Correct statement of Newton's second law.",
      line_reference: LAW,
    },
    {
      mark_id: 2,
      type: 'M1',
      earned: true,
      reasoning: 'Correct substitution into F = ma.',
      line_reference: SUB,
    },
    {
      mark_id: 3,
      type: 'A1',
      earned: false,
      reasoning:
        'Value is right, but a calculate question needs the unit — without it the accuracy mark is lost.',
      margin_note: 'unit?',
      line_reference: ANS,
    },
    {
      mark_id: 4,
      type: 'B2',
      earned: false,
      reasoning:
        'The resultant force is a vector; its direction was never stated, so the final mark is unclaimed.',
      line_reference: null,
    },
  ],
  full_marks_rewrite: {
    rewritten_answer: '…',
    annotations: [
      { text: 'F = 6.0 N', earns: 'A1' },
      { text: 'The resultant acts in the direction of the acceleration.', earns: 'B2' },
    ],
  },
} satisfies MarkingAIResult

/** A handwritten-looking script as an SVG data URI, aligned to the OCR boxes. */
function scriptDataUri(): string {
  const hand = 'font-family="Bradley Hand, Snell Roundhand, Segoe Print, cursive"'
  const ink = '#26406e'
  const rules = Array.from({ length: 11 }, (_, i) => {
    const y = 90 + i * 72
    return `<line x1="70" y1="${y}" x2="800" y2="${y}" stroke="#dce4ec" stroke-width="1.5"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 900">
    <rect width="820" height="900" fill="#fdfcf8"/>
    ${rules}
    <line x1="60" y1="0" x2="60" y2="900" stroke="#d8a69c" stroke-width="2"/>
    <text x="80" y="132" ${hand} font-size="31" fill="${ink}">${LAW}</text>
    <text x="80" y="384" ${hand} font-size="31" fill="${ink}">${SUB}</text>
    <text x="80" y="510" ${hand} font-size="31" fill="${ink}">${ANS}</text>
  </svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export default function MarkGapDevPage() {
  const pages: PageInkSource[] = [{ photo_url: scriptDataUri(), ocr_lines: OCR }]
  const inkPages = buildPerPageInk(aiMarking, pages)
  const gap = buildMarkGap(aiMarking, aiMarking.marks_earned, aiMarking.total_marks)
  const ghostFixes = inlineGhostFixes(gap)

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: '0 auto',
        padding: '40px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <header>
        <p className="ec-label-tech">DEV PREVIEW</p>
        <h1 className="ms-h2" style={{ marginTop: 6 }}>
          Mark Gap overlay
        </h1>
        <p style={{ color: 'var(--ec-text-secondary)', marginTop: 6, maxWidth: '62ch' }}>
          A fabricated 4-mark question, marked 2/4. The A1 (missing unit) resolves
          to a line, so its fix draws inline on the script; the B2 (missing
          direction) has no place on the page, so it falls back to the panel.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <ExaminerInkPerPage pages={inkPages} animate={false} ghostFixes={ghostFixes} />
        <MarkGapPanel gap={gap} />
      </div>
    </main>
  )
}
