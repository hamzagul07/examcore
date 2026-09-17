/**
 * Which paper a syllabus leaf is for, and whether that is the paper the
 * student is sitting.
 *
 * The syllabus trees label leaves in whatever form their author used:
 * 'P1', 'P1/P2', 'P1_P2', 'P1, P2', 'AS', 'A Level', 'AL', 'Paper 1 (SL)',
 * 'P3 HL', 'paper_2'. The catalogue names components 'Paper 1' or by the
 * Cambridge digits ('12' is Paper 1 variant 2). Neither side was written
 * for the other, so both are normalised to the same small vocabulary —
 * 'P1' … 'P9' — before anything is compared.
 *
 * Where a label cannot be read, the answer is null, not false: a leaf
 * labelled 'Essay' is not "off Paper 1", it is unmatched, and the scorer
 * then says nothing about the nearest paper rather than something wrong.
 *
 * Pure and client-safe; imports nothing.
 */

/** Cambridge: AS is Papers 1 and 2, A Level is Papers 3 and 4. */
const AS_PAPERS = ['P1', 'P2']
const A_LEVEL_PAPERS = ['P3', 'P4']

/** Upper-case words and digits, punctuation gone: 'P1/P2 (SL)' → ['P1', 'P2', 'SL']. */
function tokens(text: string | null | undefined): string[] {
  return (text ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** The 'P<n>' codes named by a token list, in paper order, each once. */
function paperTokens(list: string[]): string[] {
  const found = new Set<string>()
  for (let i = 0; i < list.length; i++) {
    const t = list[i]!
    const direct = /^P(\d)$/.exec(t)
    if (direct) {
      found.add(`P${direct[1]}`)
      continue
    }
    if (t === 'PAPER' && /^\d$/.test(list[i + 1] ?? '')) found.add(`P${list[i + 1]}`)
  }
  return [...found].sort()
}

/** A syllabus leaf's paper label as 'P<n>' codes; [] when it says nothing about a paper. */
export function normalisePaperLabel(label: string | null | undefined): string[] {
  const list = tokens(label)
  if (list.length === 0) return []
  const papers = paperTokens(list)
  if (papers.length > 0) return papers
  if (list.includes('AS')) return [...AS_PAPERS]
  if (list.includes('AL') || (list.includes('A') && list.includes('LEVEL'))) return [...A_LEVEL_PAPERS]
  return []
}

/** A catalogue component ('Paper 1', 'HL Paper 2', 'P3', '12', '31') as 'P<n>' codes; [] when unreadable. */
export function componentToPapers(component: string | null | undefined): string[] {
  const list = tokens(component)
  if (list.length === 0) return []
  const papers = paperTokens(list)
  if (papers.length > 0) return papers
  // Cambridge component digits: the first digit is the paper, the second the variant.
  const digits = list.find((t) => /^\d{1,2}$/.test(t))
  if (digits && digits[0] !== '0') return [`P${digits[0]}`]
  return []
}

/** The paper digit a component names, for a paper_code LIKE '9709/1%' filter. */
export function componentDigit(component: string | null | undefined): string | null {
  const papers = componentToPapers(component)
  return papers.length === 1 ? papers[0]!.slice(1) : null
}

/**
 * Whether a leaf's paper label and the student's component name the same
 * paper. null when either side is unreadable: no claim either way.
 */
export function paperMatchesComponent(leafPaper: string | null | undefined, component: string | null | undefined): boolean | null {
  const leaf = normalisePaperLabel(leafPaper)
  const chosen = componentToPapers(component)
  if (leaf.length === 0 || chosen.length === 0) return null
  return leaf.some((p) => chosen.includes(p))
}
