/** Detect question label from OCR text on a single page. */
export function detectQuestionFromPageText(text: string): string | null {
  if (!text?.trim()) return null
  const patterns = [
    /\bquestion\s*(\d+(?:\s*\([a-z]\))?(?:\s*\([ivxlc]+\))?)\b/i,
    /\bq\s*(\d+(?:\s*\([a-z]\))?(?:\s*\([ivxlc]+\))?)\b/i,
    /^(\d+(?:\([a-z]\))?(?:\([ivxlc]+\))?)\s*[.:)\-]/im,
    /\b(\d+(?:\([a-z]\))?(?:\([ivxlc]+\))?)\s*\(/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      return normalizeQuestionNumber(m[1])
    }
  }
  return null
}

export function normalizeQuestionNumber(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/question/gi, '')
}

export function formatQuestionLabel(q: string | null | undefined): string {
  if (!q) return 'Unassigned'
  const n = normalizeQuestionNumber(q)
  return n.startsWith('q') ? n.toUpperCase() : `Q${n}`
}

export function sortQuestionNumbers(nums: string[]): string[] {
  return [...nums].sort((a, b) => {
    const pa = parseQuestionSortKey(a)
    const pb = parseQuestionSortKey(b)
    if (pa.main !== pb.main) return pa.main - pb.main
    if (pa.sub !== pb.sub) return pa.sub.localeCompare(pb.sub)
    return pa.part.localeCompare(pb.part)
  })
}

function parseQuestionSortKey(q: string): {
  main: number
  sub: string
  part: string
} {
  const n = normalizeQuestionNumber(q)
  const mainMatch = n.match(/^(\d+)/)
  const main = mainMatch ? parseInt(mainMatch[1], 10) : 0
  const subMatch = n.match(/\(([a-z])\)/)
  const partMatch = n.match(/\(([ivxlc]+)\)/i)
  return {
    main,
    sub: subMatch?.[1] ?? '',
    part: partMatch?.[1] ?? '',
  }
}
