/**
 * Best-effort detection of which ingested IB paper a script is from, so the marker
 * can auto-ground on the right official scheme without the user picking. Safe by
 * construction: only ever returns a paper that is actually in `availablePapers`,
 * and returns null when uncertain (caller then falls back to the picker / derive).
 *
 * Signals, most reliable first:
 *   1. An explicit mark-scheme reference in the text (rare on student uploads).
 *   2. The question paper's footer reference code (e.g. "8821 – 7104") — UNIQUE per
 *      paper, so it disambiguates even same-session timezones (May TZ1 vs TZ2 print
 *      the same date). Codes live in IB_PAPER_CODE_ALIASES.
 *   3. The printed session line ("... November 2021 ...") → session + year. Used
 *      only when it maps to exactly one ingested paper (else ambiguous → null).
 */
import { parseIbPaperRef, schemeBasePaperRef } from './assessment-catalog'

export type DetectablePaper = {
  ref: string
  label: string
  session?: string
  year?: number
  timezone?: string
}

/** Question-paper footer reference codes → canonical paper_ref. Extend this when a
 * new paper is ingested (read the "NNNN – NNNN" code from the QP footer). Keys are
 * matched digits-only, so spacing/dash style in the source is irrelevant. */
export const IB_PAPER_CODE_ALIASES: Record<string, string> = {
  '8821-7104': 'N21/5/MATHX/SP1/ENG/TZ0/XX/M',
  '2221-7109': 'M21/5/MATHX/SP1/ENG/TZ1/XX/M',
  '8821-7105': 'N21/5/MATHX/SP2/ENG/TZ0/XX/M',
  '2221-7110': 'M21/5/MATHX/SP2/ENG/TZ1/XX/M',
  '2221-7115': 'M21/5/MATHX/SP2/ENG/TZ2/XX/M',
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

/** Digits-only form of a code so "8821 – 7104", "8821-7104", "88217104" all match. */
function normCode(s: string): string {
  return s.replace(/\D/g, '')
}

/** May/June → 'M' session, Nov/Dec → 'N'; other months are not IB exam sessions. */
function sessionLetterForMonth(month: number): string | null {
  if (month === 5 || month === 6) return 'M'
  if (month === 11 || month === 12) return 'N'
  return null
}

/**
 * Detect the paper a script is from. Returns a `ref` present in `availablePapers`,
 * or null when it can't be determined confidently.
 */
export function detectIbPaperRef(
  text: string | null | undefined,
  availablePapers: DetectablePaper[]
): { ref: string; via: 'explicit_ref' | 'footer_code' | 'session_date' } | null {
  if (!text || availablePapers.length === 0) return null
  const haveRefs = new Set(availablePapers.map((p) => p.ref))
  const lower = text.toLowerCase()

  // 1) Explicit mark-scheme reference, e.g. "N21/5/MATHX/SP1/ENG/TZ0/XX/M".
  const explicit = text.match(
    /[NM]\d{2}\/\d\/MATH[A-Z]*\/[SH]P\d\/ENG\/TZ\d\/[A-Z]{2}\/M/i
  )
  if (explicit) {
    const base = schemeBasePaperRef(explicit[0].toUpperCase())
    if (base && haveRefs.has(base)) return { ref: base, via: 'explicit_ref' }
  }

  // 2) Footer reference code → alias → paper_ref (unique per paper, incl. timezone).
  const codeToRef = new Map<string, string>()
  for (const [code, ref] of Object.entries(IB_PAPER_CODE_ALIASES)) {
    codeToRef.set(normCode(code), ref)
  }
  for (const m of text.matchAll(/\b\d{4}\s*[–—-]\s*\d{4}\b/g)) {
    const ref = codeToRef.get(normCode(m[0]))
    if (ref && haveRefs.has(ref)) return { ref, via: 'footer_code' }
  }

  // 3) Session date line ("... November 2021 ...") → session + year. Only accept
  //    when it maps to exactly ONE ingested paper (same-session TZs stay ambiguous).
  const dateMatch = lower.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})/
  )
  if (dateMatch) {
    const session = sessionLetterForMonth(MONTHS[dateMatch[1]])
    const year = parseInt(dateMatch[2], 10)
    if (session) {
      const matches = availablePapers.filter((p) => {
        const parsed = parseIbPaperRef(p.ref)
        const pSession = parsed.session === 'November' ? 'N' : parsed.session === 'May' ? 'M' : null
        return pSession === session && parsed.year === year
      })
      if (matches.length === 1) return { ref: matches[0].ref, via: 'session_date' }
    }
  }

  return null
}
