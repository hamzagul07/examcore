/**
 * One place to answer "which board is this subject, and what is its canonical
 * content code".
 *
 * This kept going wrong because subject codes arrive in two shapes and the two
 * course routes disagree about which they pass:
 *
 *   /courses/<code>              -> "9702", "ib-biology-hl"   (content dir)
 *   /ib/courses/<slug>           -> "biology-hl"              (catalog slug)
 *
 * Every site that tested `code.startsWith('ib-')` was therefore correct for the
 * legacy route and silently wrong for the canonical one. That single mistake
 * produced, on live indexed pages: "40 premium lessons live for Cambridge
 * biology-hl Biology", diagram alt text reading "for Cambridge ib-biology-hl",
 * and an explain endpoint that 404'd on every IB lesson while prompting the
 * model for Cambridge B1/M1/A1 marks on markband subjects.
 *
 * The reliable discriminator is not the prefix, it is the shape: **every
 * Cambridge syllabus code is numeric** (2281 … 9990) and no IB slug is. That
 * holds for both shapes above, so no caller has to know which one it received.
 * `lib/courses/board.test.ts` asserts it against the real content directory.
 */

export type Board = 'cambridge' | 'ib'

/** Cambridge syllabus codes are 4-digit (a few are 4-digit with a leading 2/7). */
const CAMBRIDGE_CODE = /^\d+$/

/**
 * Board for a course subject code, in either shape.
 *
 * `explicit` wins when a caller genuinely knows better (a route that carries the
 * board in its own path, say). It exists so callers never have to fall back to
 * sniffing, not because the derivation is unreliable.
 */
export function resolveBoard(code: string, explicit?: Board): Board {
  if (explicit) return explicit
  return CAMBRIDGE_CODE.test(code.trim()) ? 'cambridge' : 'ib'
}

export function isIbSubjectCode(code: string, explicit?: Board): boolean {
  return resolveBoard(code, explicit) === 'ib'
}

/** Human label. Cambridge keeps its code — "9702" is what students search. */
export function boardLabel(code: string, explicit?: Board): string {
  return resolveBoard(code, explicit) === 'ib' ? 'IB Diploma' : `Cambridge ${code}`
}

/**
 * The content-directory code, which is where lesson JSON actually lives:
 * "biology-hl" and "ib-biology-hl" both resolve to "ib-biology-hl"; "9702"
 * stays as is.
 */
export function contentSubjectCode(code: string, explicit?: Board): string {
  const trimmed = code.trim()
  if (resolveBoard(trimmed, explicit) === 'cambridge') return trimmed
  return trimmed.startsWith('ib-') ? trimmed : `ib-${trimmed}`
}

/**
 * The catalog slug used by the canonical IB routes — the inverse of
 * `contentSubjectCode`. Cambridge codes pass through unchanged.
 */
export function catalogSubjectSlug(code: string, explicit?: Board): string {
  const trimmed = code.trim()
  if (resolveBoard(trimmed, explicit) === 'cambridge') return trimmed
  return trimmed.startsWith('ib-') ? trimmed.slice(3) : trimmed
}

/** Level from a course slug: "biology-hl" -> HL. Defaults to SL. */
export function subjectLevel(code: string): 'HL' | 'SL' {
  return /-hl$/i.test(code.trim()) ? 'HL' : 'SL'
}
