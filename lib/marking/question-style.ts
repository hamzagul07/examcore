import { isMathSubjectCode } from '@/lib/marking/math-subjects'

/**
 * Is this an extended-response question that must be banded, not point-hunted?
 *
 * Marking style used to fall through to `point_based` whenever no official
 * scheme resolved. That is right for "State two reasons" and catastrophic for
 * "Evaluate the view that a national minimum wage always reduces employment":
 * the pipeline derives a list of discrete award points, then checks continuous
 * prose against a checklist it will never match. A real 12-mark answer scored
 * 0/12 that way, and across the corpus essay-shaped questions marked
 * point-based hit a 27% zero rate against 0% for the same shape banded.
 *
 * The two failure modes are not symmetric, and the threshold is set to reflect
 * that. Banding a point-based question costs precision — the student gets a
 * fair mark with less granular feedback. Point-hunting an essay costs the
 * student their marks outright. So this leans towards banding.
 */

/**
 * Command terms that ask for a sustained argument rather than recall.
 *
 * "Explain" is deliberately absent. It is the single most common command term
 * on point-based questions, and including it would flip a large share of
 * ordinary short-answer marking to banding.
 */
const EXTENDED_RESPONSE_COMMANDS =
  /\b(evaluate|discuss|to what extent|assess|justify|examine|critically|how far do you agree|comment on the view|analyse the view|compare and contrast)\b/i

/**
 * Below this tariff, an evaluative verb usually still means a short structured
 * answer (two marks a point) rather than an essay.
 */
export const EXTENDED_RESPONSE_MIN_MARKS = 6

export type ExtendedResponseInput = {
  questionText: string
  /** Null when unknown — the check then declines rather than guesses. */
  totalMarks: number | null
  subjectCode?: string | null
}

export function looksLikeExtendedResponse({
  questionText,
  totalMarks,
  subjectCode,
}: ExtendedResponseInput): boolean {
  const text = questionText?.trim()
  if (!text) return false

  // Maths never bands. "Justify your answer" after a derivation is a method
  // mark, not an argument, and banding it would lose the working entirely.
  if (isMathSubjectCode(subjectCode ?? '')) return false

  // An unknown tariff is not a reason to guess: without a denominator we cannot
  // tell a 2-mark "discuss briefly" from a 20-mark essay, and the point-based
  // path at least degrades gracefully.
  if (typeof totalMarks !== 'number' || totalMarks < EXTENDED_RESPONSE_MIN_MARKS) {
    return false
  }

  return EXTENDED_RESPONSE_COMMANDS.test(text)
}

/**
 * A generic level-of-response scale, scaled to the question's tariff.
 *
 * Used only when a question needs banding and no official scheme exists. It is
 * labelled `generic_band_scale` in the JSON on purpose: the marker must be able
 * to tell this from a real published scheme, because presenting invented bands
 * as an exam board's own is how a plausible mark becomes an untrue one.
 *
 * Written in assessment-objective language (knowledge → application → analysis
 * → evaluation) because that ladder is what essentially every board's
 * level-of-response scheme is built on, so a band judgement made against it
 * transfers rather than misleads.
 */
const BAND_DESCRIPTORS = [
  'Limited. Isolated or largely irrelevant knowledge. Little use of the material in the question, and no developed argument.',
  'Basic. Relevant knowledge shown but mostly descriptive. Some application to the question; analysis is asserted rather than developed.',
  'Good. Accurate, relevant knowledge applied to the question. Analysis is developed and mostly sustained, with some evaluation that is not yet consistently supported.',
  'Excellent. Precise knowledge used selectively to build a sustained argument. Analysis is thorough and evaluation is explicit, weighed, and leads to a supported judgement.',
]

export function buildGenericBandScale(totalMarks: number): Record<string, unknown> {
  const total = Math.max(1, Math.round(totalMarks))

  // Distinct upper bounds only. A small tariff cannot support four bands, and
  // rounding quarters of it produced overlapping ranges like "L1=1, L2=1" —
  // asking the model to place a response in two bands at once. Collapsing to
  // however many bands actually fit keeps every range contiguous and unique.
  const uppers = [...new Set([0.25, 0.5, 0.75, 1]
    .map((f) => Math.max(1, Math.round(total * f)))
    .filter((m) => m <= total))].sort((a, b) => a - b)
  if (uppers[uppers.length - 1] !== total) uppers.push(total)

  // The top band must always read as the top: when bands collapse, keep the
  // highest descriptors rather than the first ones.
  const descriptors = BAND_DESCRIPTORS.slice(BAND_DESCRIPTORS.length - uppers.length)

  let lower = 1
  const bands = uppers.map((upper, i) => {
    const marks = lower >= upper ? `${upper}` : `${lower}-${upper}`
    lower = upper + 1
    return { level: i + 1, marks, descriptor: descriptors[i] }
  })

  return {
    type: 'level_of_response',
    source: 'generic_band_scale',
    note: 'No published mark scheme was available for this question. These bands are a generic assessment-objective scale, not the exam board\'s own wording.',
    total_marks: total,
    bands: [
      { level: 0, marks: '0', descriptor: 'No creditable response.' },
      ...bands,
    ],
  }
}
