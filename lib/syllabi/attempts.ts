/**
 * Helpers for associating attempts with a subject code (Cambridge or IB).
 */

import type { AttemptLite } from '@/lib/mastery'
import { getValidSyllabusCodes, hasSyllabusTree } from '@/lib/syllabi'
import { getIbMarkableSubjectCodes } from '@/lib/ib/marking-config'

const SYLLABUS_SUBJECT_CODES = [
  '9709',
  '9231',
  '9700',
  '9701',
  '9702',
  '9708',
  '9489',
  '9699',
  '9990',
  '9609',
  '9706',
  '9618',
  '9084',
  '9488',
  '9607',
] as const

export type AttemptWithPaper = AttemptLite & {
  mark_schemes?: { paper_code: string | null } | { paper_code: string | null }[] | null
  /** Optional text cues when paper_code is missing (homework / practice scans). */
  question_text?: string | null
  ocr_text?: string | null
}

function paperCodeFromAttempt(attempt: AttemptWithPaper): string | null {
  const ms = attempt.mark_schemes
  if (!ms) return null
  const row = Array.isArray(ms) ? ms[0] : ms
  const code = row?.paper_code
  if (!code || typeof code !== 'string') return null
  return code.split('/')[0] || null
}

// Cambridge codes first so existing tie-breaking is unchanged; IB subjects
// (which have syllabus trees too) are appended so IB attempts — whose
// paper_code is absent for practice marking — still resolve from their tags.
const TAG_INFERENCE_SUBJECT_CODES: readonly string[] = [
  ...SYLLABUS_SUBJECT_CODES,
  ...getIbMarkableSubjectCodes(),
]

/** Infer subject from syllabus_tags when paper_code is unavailable. */
function subjectFromTags(
  tags: string[] | null | undefined,
  preferredSubjectCodes?: readonly string[] | null
): string | null {
  if (!tags?.length) return null

  const preferred = preferredSubjectCodes?.filter(Boolean) ?? []
  const preferredRank = (code: string) => {
    const i = preferred.indexOf(code)
    return i === -1 ? 999 : i
  }

  let bestCode: string | null = null
  let bestScore = 0

  for (const code of TAG_INFERENCE_SUBJECT_CODES) {
    if (!hasSyllabusTree(code)) continue
    const valid = new Set(getValidSyllabusCodes(code))
    let score = 0
    for (const tag of tags) {
      if (valid.has(tag)) score += 1
    }
    if (
      score > bestScore ||
      (score === bestScore &&
        score > 0 &&
        bestCode != null &&
        preferredRank(code) < preferredRank(bestCode))
    ) {
      bestScore = score
      bestCode = code
    }
  }

  return bestScore > 0 ? bestCode : null
}

/** Keyword cues from homework OCR / typed stems when tags are ambiguous (e.g. 1.1). */
function subjectFromAttemptText(attempt: AttemptWithPaper): string | null {
  const hay = `${attempt.question_text ?? ''} ${attempt.ocr_text ?? ''}`.toLowerCase()
  if (!hay.trim()) return null

  // Accounting first — "depreciation of assets" must not hit Economics currency depreciation.
  if (
    /trial balance|double entry|depreciation of|non-current asset|ledger|balance sheet|cost.?volume|absorption costing|bank reconciliation|statement of financial position/.test(
      hay
    )
  ) {
    return '9706'
  }

  // Economics — avoid bare "depreciat" / commerce "differentiation" / "integration".
  if (
    /scarcit|opportunity cost|aggregate demand|aggregate supply|currency depreciat|exchange.?rate depreciat|marshall-lerner|macroeconomic|price elasticity|circular flow|producer surplus|consumer surplus|fiscal policy|monetary policy/.test(
      hay
    )
  ) {
    return '9708'
  }

  // Maths — require exam-math stems, not "product differentiation" / "economic integration".
  if (
    /quadratic|completing the square|binomial expansion|trigonometry|stationary point|dy\/dx|d\/dx|∫|definite integral|differentiate with respect|integration by|chain rule|product rule/.test(
      hay
    )
  ) {
    return '9709'
  }

  return null
}

/**
 * Resolve attempt → subject. Prefer paper_code, then text cues, then tag voting
 * (ties break toward the student's profile subjects when provided).
 */
export function getAttemptSubjectCode(
  attempt: AttemptWithPaper,
  preferredSubjectCodes?: readonly string[] | null
): string | null {
  const fromPaper = paperCodeFromAttempt(attempt)
  if (fromPaper) return fromPaper
  const fromText = subjectFromAttemptText(attempt)
  const fromTags = subjectFromTags(attempt.syllabus_tags, preferredSubjectCodes)
  if (fromText && fromTags && fromText !== fromTags) {
    if (
      !preferredSubjectCodes?.length ||
      preferredSubjectCodes.includes(fromText)
    ) {
      return fromText
    }
    // Preferred list rejects the text cue — trust syllabus tags instead.
    return fromTags
  }
  return fromText ?? fromTags
}

/** Resolve subject for marking UI / badges (API field, paper code, or tag voting). */
export function resolveMarkResultSubjectCode(params: {
  subject_code?: string | null
  paper_code?: string | null
  syllabus_tags?: string[] | null
}): string | null {
  const explicit = params.subject_code?.trim()
  if (explicit) return explicit
  const fromPaper = params.paper_code?.split('/')[0]?.trim()
  if (fromPaper) return fromPaper
  return subjectFromTags(params.syllabus_tags)
}

export function filterAttemptsBySubject(
  attempts: AttemptWithPaper[],
  subjectCode: string
): AttemptLite[] {
  return attempts.filter((a) => getAttemptSubjectCode(a) === subjectCode)
}
