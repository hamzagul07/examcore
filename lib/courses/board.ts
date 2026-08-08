/**
 * One place to answer "which board is this subject, and what is its canonical
 * content code".
 *
 * Phase E0: behaviour is unchanged for CAIE + IB, but resolution goes through
 * the ExamSystem registry (`lib/exam-systems`) so new boards are adapters, not
 * another `startsWith` fork.
 *
 *   /courses/<code>              -> "9702", "ib-biology-hl"   (content dir)
 *   /ib/courses/<slug>           -> "biology-hl"              (catalog slug)
 *
 * The reliable discriminator for live boards remains: **every Cambridge
 * syllabus code is numeric**; IB owns non-numeric slugs until another adapter
 * claims them (Edexcel unit codes will register ahead of IB in resolve order).
 */

import {
  resolveExamSystemForSubject,
  type ExamSystemId,
} from '@/lib/exam-systems'

/** @deprecated Prefer ExamSystemId — kept as the historical courses/mark alias. */
export type Board = ExamSystemId

/**
 * Board for a course subject code, in either shape.
 *
 * `explicit` wins when a caller genuinely knows better (a route that carries the
 * board in its own path, say).
 */
export function resolveBoard(code: string, explicit?: Board): Board {
  return resolveExamSystemForSubject(code, explicit).id
}

export function isIbSubjectCode(code: string, explicit?: Board): boolean {
  return resolveBoard(code, explicit) === 'ib'
}

/** Human label. Cambridge keeps its code — "9702" is what students search. */
export function boardLabel(code: string, explicit?: Board): string {
  return resolveExamSystemForSubject(code, explicit).boardLabel(code)
}

/**
 * The content-directory code, which is where lesson JSON actually lives:
 * "biology-hl" and "ib-biology-hl" both resolve to "ib-biology-hl"; "9702"
 * stays as is.
 */
export function contentSubjectCode(code: string, explicit?: Board): string {
  return resolveExamSystemForSubject(code, explicit).contentSubjectCode(code)
}

/**
 * The catalog slug used by the canonical IB routes — the inverse of
 * `contentSubjectCode`. Cambridge codes pass through unchanged.
 */
export function catalogSubjectSlug(code: string, explicit?: Board): string {
  return resolveExamSystemForSubject(code, explicit).catalogSubjectSlug(code)
}

/** Level from a course slug: "biology-hl" -> HL. Defaults to SL. */
export function subjectLevel(code: string): 'HL' | 'SL' {
  return /-hl$/i.test(code.trim()) ? 'HL' : 'SL'
}
