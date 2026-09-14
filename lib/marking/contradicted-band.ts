/**
 * Catch a band judgment that contradicts the answer it was given.
 *
 * On 2026-09-14 a student marked an IB French B SL diary entry three times in
 * twenty-two minutes and got 8/12, 1/12 and 8/12. The 1/12 justified itself like
 * this:
 *
 *   "the text is a fragment, stopping mid-sentence after only two lines"
 *
 * The answer it was handed was 2,043 characters — the complete essay. The model
 * did not mark the work harshly; it described an input that did not exist and
 * then scored that. `reconcileMarkResult` could not help: the arithmetic was
 * internally consistent, 1 out of 12, summed correctly. The number was sound and
 * the reasoning underneath it was false.
 *
 * That is the gap this closes. Reconciliation makes the model's arithmetic
 * trustworthy; this makes its *premise* checkable. It is the cheapest honest
 * assertion available — we know exactly how many characters we sent, so a claim
 * that almost nothing arrived is verifiable without a second opinion, without a
 * model call, and without knowing anything about French.
 *
 * Deliberately narrow. It fires only when BOTH:
 *   - the justification claims the answer was absent, fragmentary or truncated, and
 *   - the answer was in fact substantial, and
 *   - the award sits in the bottom of the range,
 * because a "fragment" remark attached to a mid-band mark is ordinary examiner
 * commentary, not a misread. A guard that fires on ordinary commentary would be
 * turned off within a week.
 */

/**
 * Phrases that assert the answer barely arrived.
 *
 * Kept to claims about QUANTITY — what reached the marker — rather than quality.
 * "Underdeveloped" or "lacks detail" are judgments about work that was read and
 * found wanting, which is exactly what an examiner is for; "stops after two
 * lines" is a statement about the input, which we can check.
 */
const ABSENCE_CLAIMS: RegExp[] = [
  /\bis (?:a |an )?(?:mere |short )?fragment\b/i,
  /\bfragmentary\b/i,
  /\bonly (?:a )?(?:one|two|three|1|2|3) (?:lines?|sentences?|words?)\b/i,
  /\b(?:stops?|stopping|ends?|ending|cuts? off|breaks? off) (?:abruptly )?(?:mid|part[- ]?way|half[- ]?way)[- ]?(?:sentence|way|thought)?\b/i,
  /\bincomplete\b.*\b(?:sentence|fragment|line)\b/i,
  /\b(?:no|nothing|barely any|almost no) (?:answer|response|text|work|writing) (?:was )?(?:submitted|provided|present|visible|legible)\b/i,
  /\banswer (?:is|was) (?:blank|empty|missing)\b/i,
  /\btoo short to (?:mark|assess|award)\b/i,
]

/**
 * Characters below which "this is a fragment" is a fair description.
 *
 * A short-answer response can legitimately be two lines, so the floor has to sit
 * above anything a real brief answer would occupy. ~500 characters is roughly
 * eighty words — past the point where "only two lines" can be true of it.
 */
export const SUBSTANTIAL_ANSWER_CHARS = 500

/**
 * Award fraction at or below which an absence claim is load-bearing. Above it
 * the remark is commentary sitting beside marks that were actually given.
 */
export const BOTTOM_AWARD_FRACTION = 0.2

export type BandContradictionInput = {
  /** Everything the model said to justify the award, concatenated. */
  justification: string
  /** Characters of answer text actually sent to the marker. */
  answerChars: number
  marksAwarded: number | null | undefined
  marksAvailable: number | null | undefined
}

export type BandContradiction = {
  contradicted: boolean
  /** The phrase that tripped it, for the log line and the re-run decision. */
  claim: string | null
}

/**
 * True when the justification says the answer barely arrived and it plainly did.
 *
 * Returns the matched phrase so the warning can quote the model back to itself —
 * an unexplained "re-marking your answer" in the logs is not debuggable.
 */
export function findBandContradiction(
  input: BandContradictionInput
): BandContradiction {
  const none: BandContradiction = { contradicted: false, claim: null }

  if (input.answerChars < SUBSTANTIAL_ANSWER_CHARS) return none

  const available = input.marksAvailable ?? 0
  const awarded = input.marksAwarded ?? 0
  // An unknown denominator cannot place the award, and guessing would make this
  // fire on marks it knows nothing about.
  if (!(available > 0)) return none
  if (awarded / available > BOTTOM_AWARD_FRACTION) return none

  const text = input.justification?.trim()
  if (!text) return none

  for (const pattern of ABSENCE_CLAIMS) {
    const hit = text.match(pattern)
    if (hit) return { contradicted: true, claim: hit[0] }
  }
  return none
}

/**
 * Pull every string a band result uses to explain itself, so one phrasing does
 * not slip through because it landed in `summary` rather than `justification`.
 */
export function bandJustificationText(band: unknown, summary?: unknown): string {
  const parts: string[] = []
  if (typeof summary === 'string') parts.push(summary)
  if (band && typeof band === 'object') {
    const b = band as Record<string, unknown>
    for (const key of ['justification', 'band_descriptor', 'descriptor']) {
      if (typeof b[key] === 'string') parts.push(b[key] as string)
    }
    if (Array.isArray(b.improvements)) {
      for (const item of b.improvements) {
        if (typeof item === 'string') parts.push(item)
      }
    }
  }
  return parts.join(' \n ')
}
