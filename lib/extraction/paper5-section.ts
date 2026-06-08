/**
 * Paper 5 (Planning & Analysis) uses named MS sections instead of (a)(b)(c).
 * Example: 1(Defining the problem) → base question 1, canonical letter a.
 */

export type Paper5SectionParse = {
  baseQuestionNumber: string
  sectionLabel: string
  canonicalLetter: string
  canonicalQuestionNumber: string
}

const SECTION_RULES: Array<{ letter: string; patterns: RegExp[] }> = [
  {
    letter: 'a',
    patterns: [/defining\s+the\s+problem/i],
  },
  {
    letter: 'b',
    patterns: [/methods?\s+of\s+data\s+collection/i, /method\s+of\s+data\s+collection/i],
  },
  {
    letter: 'c',
    patterns: [/methods?\s+of\s+analysis/i, /method\s+of\s+analysis/i],
  },
  {
    letter: 'd',
    patterns: [/sources?\s+of\s+uncertainty/i, /limitations/i],
  },
  {
    letter: 'e',
    patterns: [/additional\s+detail/i, /safety\s+considerations/i, /improvements/i],
  },
]

const PAPER5_HEADER_RE = /^(\d+)\s*\(([^)]+)\)\s*$/i

export function parsePaper5SectionHeader(raw: string): Paper5SectionParse | null {
  const trimmed = raw.trim()
  const match = trimmed.match(PAPER5_HEADER_RE)
  if (!match) return null

  const baseQuestionNumber = match[1]
  const sectionLabel = match[2].trim()
  const lowered = sectionLabel.toLowerCase()

  for (const rule of SECTION_RULES) {
    if (rule.patterns.some((p) => p.test(lowered))) {
      return {
        baseQuestionNumber,
        sectionLabel,
        canonicalLetter: rule.letter,
        canonicalQuestionNumber: `${baseQuestionNumber}(${rule.letter})`,
      }
    }
  }

  return {
    baseQuestionNumber,
    sectionLabel,
    canonicalLetter: 'a',
    canonicalQuestionNumber: `${baseQuestionNumber}(a)`,
  }
}

export function isPaper5SectionHeader(raw: string): boolean {
  const trimmed = raw.trim()
  const match = trimmed.match(PAPER5_HEADER_RE)
  if (!match) return false
  const inner = match[2].trim()
  // Standard sub-parts like 2(a) or 2(c)(i) — not named Paper 5 sections.
  if (/^[a-z](?:\([ivx]+\))?$/i.test(inner)) return false
  return inner.includes(' ') || inner.length > 3
}
