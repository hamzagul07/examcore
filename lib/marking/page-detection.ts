/**
 * Question labels on photographed pages: which question a page belongs to,
 * how question numbers order, and how a segment's number answers to a page's
 * label. Everything here is pure and unit-tested (page-detection.test.ts).
 */

/** "1"–"99" and not the start of a longer number ("2024" is a year). */
const NUMBER = String.raw`\d{1,2}(?!\d)`
/** Optional sub-part and roman part: "(a)", "(a)(ii)", "(iii)". */
const PART = String.raw`(?:\s*\([a-z]\))?(?:\s*\([ivxlc]+\))?`

/**
 * A label is trusted only at the START of a line and only with a marker:
 * "Question 3", "Q3", "Q.3", "3.", "3)", "3:" or a sub-part "3(a)", "3 (b)(ii)".
 *
 * The previous patterns also accepted a bare number followed by an opening
 * bracket anywhere in the text, so a line of working such as "2 (x+1) = 6"
 * labelled the whole page "Question 2" and its answer was sent to the wrong
 * marker. Maths is full of numbers beside brackets; a page label is not.
 *
 * A marker '.' must not be followed by a digit ("12.5 = x" is a decimal), and
 * the sub-part form must not run straight into more letters or another
 * bracket ("3(a)(b)" is not a label, "3(a)(ii)" is).
 */
const LABEL_PATTERNS: RegExp[] = [
  // "Question 3", "question 3 (a)(ii)"
  new RegExp(String.raw`^[ \t]*question\s*(${NUMBER}${PART})(?![\w(])`, 'im'),
  // "Q3", "Q 3", "Q.3", "Q3(a)"
  new RegExp(String.raw`^[ \t]*q\s*\.?\s*(${NUMBER}${PART})(?![\w(])`, 'im'),
  // "3.", "3)", "3:", "3(a)." — a number with a marker, not "3.5"
  new RegExp(String.raw`^[ \t]*(${NUMBER}${PART})\s*[.:)](?!\d)`, 'im'),
  // "3(a)", "3 (b)(ii)" — the sub-part is the marker
  new RegExp(
    String.raw`^[ \t]*(${NUMBER}\s*\([a-z]\)(?:\s*\([ivxlc]+\))?)(?![\w(])`,
    'im'
  ),
]

/** Detect question label from OCR text on a single page. */
export function detectQuestionFromPageText(text: string): string | null {
  if (!text?.trim()) return null
  for (const re of LABEL_PATTERNS) {
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

/** "3(a)(ii)" → "3"; "Q4" → "4"; anything without a leading number → "". */
export function questionMainNumber(q: string): string {
  const m = normalizeQuestionNumber(q).replace(/^q/, '').match(/^(\d+)/)
  return m ? m[1] : ''
}

/**
 * How a page's label answers for a segment's question number.
 *
 *   exact      — the same question ("3 (a)" ↔ "3(a)")
 *   parent     — the page is labelled with the whole question ("3") and the
 *                segment is one of its parts ("3(a)")
 *   part       — the page is labelled with a part ("3(b)") of the segment's
 *                whole question ("3")
 *   null       — a different question ("3" ↔ "30"), or sibling parts
 *                ("3(a)" ↔ "3(b)"): the page holds a different answer
 *
 * The old matcher compared normalised strings only, so a paper segmented as
 * "3(a)", "3(b)" against pages whose header just said "Question 3" attached no
 * page to either — no examiner ink and no OCR boxes for a question that was
 * photographed perfectly well.
 */
export function questionLabelMatch(
  segmentQuestion: string,
  pageLabel: string
): 'exact' | 'parent' | 'part' | null {
  const seg = normalizeQuestionNumber(segmentQuestion).replace(/^q/, '')
  const page = normalizeQuestionNumber(pageLabel).replace(/^q/, '')
  if (!seg || !page) return null
  if (seg === page) return 'exact'
  const main = questionMainNumber(seg)
  if (!main || main !== questionMainNumber(page)) return null
  if (page === main) return 'parent'
  if (seg === main) return 'part'
  return null
}

const ROMAN_VALUES: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 }

/** "iv" → 4. Only ever called on strings drawn from [ivxlc]. */
export function romanToInt(s: string): number {
  const t = s.toLowerCase()
  let total = 0
  for (let i = 0; i < t.length; i++) {
    const v = ROMAN_VALUES[t[i]] ?? 0
    const next = ROMAN_VALUES[t[i + 1]] ?? 0
    total += v < next ? -v : v
  }
  return total
}

const ROMAN_RE = /^[ivxlc]+$/

/**
 * Compare one bracketed part with another. Roman parts compare by value —
 * (ii) before (iv) before (ix) — where the old lexical sort put (ix) between
 * (ii) and (iv) and (x) after (v).
 *
 * A single letter is a letter unless the other side proves the level is
 * roman: "(c)" and "(i)" are both valid numerals, but a paper that labels
 * parts (a)…(j) contains both as letters, and reading them as 100 and 1 would
 * put (i) before (c). Only when one side is more than one character ("ii",
 * "iv") can the level be roman at all.
 */
function comparePart(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return -1
  if (!b) return 1
  const bothRoman =
    ROMAN_RE.test(a) && ROMAN_RE.test(b) && (a.length > 1 || b.length > 1)
  if (bothRoman) return romanToInt(a) - romanToInt(b)
  return a.localeCompare(b)
}

function parseQuestionSortKey(q: string): { main: number; parts: string[] } {
  const n = normalizeQuestionNumber(q).replace(/^q/, '')
  const mainMatch = n.match(/^(\d+)/)
  const main = mainMatch ? parseInt(mainMatch[1], 10) : 0
  const parts = [...n.matchAll(/\(([a-z]+)\)/g)].map((m) => m[1])
  return { main, parts }
}

export function compareQuestionNumbers(a: string, b: string): number {
  const pa = parseQuestionSortKey(a)
  const pb = parseQuestionSortKey(b)
  if (pa.main !== pb.main) return pa.main - pb.main
  const depth = Math.max(pa.parts.length, pb.parts.length)
  for (let i = 0; i < depth; i++) {
    const c = comparePart(pa.parts[i] ?? '', pb.parts[i] ?? '')
    if (c !== 0) return c
  }
  return 0
}

export function sortQuestionNumbers(nums: string[]): string[] {
  return [...nums].sort(compareQuestionNumbers)
}
