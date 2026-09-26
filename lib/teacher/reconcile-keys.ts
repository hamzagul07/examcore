/**
 * Keys that match a marked attempt to an assignment item when the attempt was
 * not started from the assignment link (docs/TEACHER_SYSTEM_SPEC.md, conflict
 * ruling "Reconciliation key").
 *
 * The primary match is `attempts.mark_scheme_id = assignment_items.mark_scheme_id`
 * and needs no key. These are the fallbacks, and both sides of a comparison
 * must be built here so they cannot drift apart:
 *
 *   'q:{paper_code}|{paper_session}|{question_number}'
 *       One banked question — the same string loadRoadmapEvidence and
 *       blockEvidenceKey (lib/plan) produce, so a mark that ticks a roadmap
 *       block also hands in the matching assignment item. Used for rows whose
 *       scheme id cannot be compared: an item whose mark_schemes row has
 *       since been deleted (the FK sets it null), or two scheme rows for the
 *       same question.
 *   'p:{paper_code}|{paper_session}'
 *       A whole paper. Whole-paper attempts carry no mark_scheme_id; the
 *       paper they are for lives in ai_marking.paper_code / paper_session.
 *
 * Values are trimmed and otherwise used verbatim (no case folding), so for
 * clean data the question key is byte-identical to the roadmap's.
 */

import type { AssignmentItem } from '@/lib/teacher/types'

export type SchemeRef = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v ? v : null
}

function questionKey(paperCode: unknown, paperSession: unknown, questionNumber: unknown): string | null {
  const paper = clean(paperCode)
  const session = clean(paperSession)
  const qn = clean(questionNumber)
  if (!paper || !session || !qn) return null
  return `q:${paper}|${session}|${qn}`
}

function paperKey(paperCode: unknown, paperSession: unknown): string | null {
  const paper = clean(paperCode)
  const session = clean(paperSession)
  if (!paper || !session) return null
  return `p:${paper}|${session}`
}

/**
 * The question key for an attempt, from its embedded `mark_schemes` row
 * (select `mark_schemes ( paper_code, paper_session, question_number )`).
 * PostgREST returns a to-one embed as an object, but the generated types (and
 * some older call sites) treat it as an array, so both are accepted. Null
 * when there is no scheme or any part is missing.
 */
export function legacyAttemptKey(a: { mark_schemes?: SchemeRef | SchemeRef[] | null }): string | null {
  const embed = a.mark_schemes
  const scheme = Array.isArray(embed) ? embed[0] : embed
  if (!scheme) return null
  return questionKey(scheme.paper_code, scheme.paper_session, scheme.question_number)
}

/** The same question key, built from an assignment item's own columns. */
export function legacyItemKey(
  item: Pick<AssignmentItem, 'item_type' | 'paper_code' | 'paper_session' | 'question_number'>
): string | null {
  if (item.item_type !== 'past_paper_question') return null
  return questionKey(item.paper_code, item.paper_session, item.question_number)
}

/**
 * The whole-paper key for an attempt, from `ai_marking.paper_code` /
 * `ai_marking.paper_session` (written by /api/mark/whole-paper/init). Null for
 * anything that is not a readable object with both.
 */
export function wholePaperAttemptKey(a: { ai_marking?: unknown }): string | null {
  const marking = a.ai_marking
  if (!marking || typeof marking !== 'object' || Array.isArray(marking)) return null
  const { paper_code, paper_session } = marking as Record<string, unknown>
  return paperKey(paper_code, paper_session)
}

/** The whole-paper key for a whole_paper assignment item. */
export function wholePaperItemKey(
  item: Pick<AssignmentItem, 'item_type' | 'paper_code' | 'paper_session'>
): string | null {
  if (item.item_type !== 'whole_paper') return null
  return paperKey(item.paper_code, item.paper_session)
}
