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
function subjectFromTags(tags: string[] | null | undefined): string | null {
  if (!tags?.length) return null

  let bestCode: string | null = null
  let bestScore = 0

  for (const code of TAG_INFERENCE_SUBJECT_CODES) {
    if (!hasSyllabusTree(code)) continue
    const valid = new Set(getValidSyllabusCodes(code))
    let score = 0
    for (const tag of tags) {
      if (valid.has(tag)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestCode = code
    }
  }

  return bestScore > 0 ? bestCode : null
}

export function getAttemptSubjectCode(attempt: AttemptWithPaper): string | null {
  return paperCodeFromAttempt(attempt) ?? subjectFromTags(attempt.syllabus_tags)
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
