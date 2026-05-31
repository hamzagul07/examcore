import type { LineReference } from '@/components/examiner-ink/ExaminerInkOverlay'
import type { SimulatedMark } from '@/components/mark/cinematic/types'

/**
 * Derive the climax's simulated examiner strokes.
 *
 * When the real result has already arrived, we shape the strokes around the
 * real Gemini bboxes so the dissolve into the real ExaminerInkOverlay is
 * pixel-close. When it hasn't, we fall back to plausible positions (upper tick,
 * mid underline, margin curl, marginal note) — never random, so it always
 * reads like an examiner working a page.
 *
 * Capped at 5, floored at 3, so the moment is legible at any phase length.
 */

const FALLBACK: SimulatedMark[] = [
  { id: 'sim-tick', kind: 'tick', xPct: 84, yPct: 22, sizePct: 11 },
  { id: 'sim-underline', kind: 'underline', xPct: 24, yPct: 49, widthPct: 40 },
  { id: 'sim-curl', kind: 'curl', xPct: 88, yPct: 64, sizePct: 10 },
  { id: 'sim-note', kind: 'note', xPct: 86, yPct: 80, text: 'M1' },
]

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export function deriveSimulatedMarks(
  lineReferences?: LineReference[] | null
): SimulatedMark[] {
  const positioned = (lineReferences ?? []).filter((l) => l.bbox)
  if (positioned.length === 0) return FALLBACK

  // Sort top-to-bottom so picks read as upper / mid / lower.
  const sorted = [...positioned].sort(
    (a, b) => (a.bbox!.top ?? 0) - (b.bbox!.top ?? 0)
  )
  const earned = sorted.filter((l) => l.earned)
  const lost = sorted.filter((l) => !l.earned)

  const marks: SimulatedMark[] = []

  // 1) Tick beside the first earned line (upper portion preferred).
  const tickSrc = earned[0] ?? sorted[0]
  if (tickSrc?.bbox) {
    const b = tickSrc.bbox
    marks.push({
      id: `sim-tick-${tickSrc.mark_id}`,
      kind: 'tick',
      xPct: clamp(b.left + b.width + 4, 6, 90),
      yPct: clamp(b.top + b.height / 2, 6, 92),
      sizePct: 11,
    })
  }

  // 2) Underline beneath a mid-paper line (a lost mark if there is one).
  const midSrc =
    lost[0] ?? sorted[Math.floor(sorted.length / 2)] ?? sorted[0]
  if (midSrc?.bbox) {
    const b = midSrc.bbox
    marks.push({
      id: `sim-underline-${midSrc.mark_id}`,
      kind: 'underline',
      xPct: clamp(b.left, 2, 80),
      yPct: clamp(b.top + b.height + 1.5, 6, 96),
      widthPct: clamp(b.width, 18, 60),
    })
  }

  // 3) Margin curl near a lower line.
  const lowSrc = sorted[sorted.length - 1]
  if (lowSrc?.bbox && lowSrc !== tickSrc) {
    const b = lowSrc.bbox
    marks.push({
      id: `sim-curl-${lowSrc.mark_id}`,
      kind: 'curl',
      xPct: clamp(b.left + b.width + 5, 8, 90),
      yPct: clamp(b.top + b.height / 2, 8, 92),
      sizePct: 10,
    })
  }

  // 4) A marginal note (M1 if a mark was earned, otherwise a checkpoint).
  const noteSrc = earned[1] ?? earned[0] ?? sorted[0]
  if (noteSrc?.bbox) {
    const b = noteSrc.bbox
    marks.push({
      id: `sim-note-${noteSrc.mark_id}`,
      kind: 'note',
      xPct: clamp(b.left + b.width + 6, 8, 88),
      yPct: clamp(b.top + b.height / 2 + 6, 8, 94),
      text: noteSrc.earned ? 'M1' : 'B1',
    })
  }

  // Floor at 3 by topping up from the fallback set if the page was sparse.
  if (marks.length < 3) {
    for (const f of FALLBACK) {
      if (marks.length >= 3) break
      marks.push(f)
    }
  }

  return marks.slice(0, 5)
}
