import type { EffectiveAccess } from './access'

/**
 * Trial-aware paid check — use for feature gating: Polar checkout trials
 * (status trialing) still have a paid tier in the DB.
 */
export function hasPaidAccess(access: EffectiveAccess): boolean {
  return access !== 'free'
}

/**
 * Launch promo: interactive diagrams (the lesson "Explore the concept" visuals)
 * are free for everyone while MarkScheme is new. Flip to `false` to move them
 * back behind Pro/Max — that single change re-gates the lesson section AND
 * updates the pricing page / comparison-matrix copy.
 */
export const INTERACTIVE_DIAGRAMS_FREE = true

/** Max questions marked per whole-paper upload on the free tier (preview). */
export const FREE_WHOLE_PAPER_QUESTION_LIMIT = 3

/** Paid / preview cap for whole-paper segmentation. */
export const WHOLE_PAPER_QUESTION_LIMIT = 15

export function wholePaperQuestionLimit(access: EffectiveAccess): number {
  return hasPaidAccess(access)
    ? WHOLE_PAPER_QUESTION_LIMIT
    : FREE_WHOLE_PAPER_QUESTION_LIMIT
}

/*
 * Premium marking gates. Each is its own predicate (rather than inlining
 * `hasPaidAccess`) so a feature can later be re-tiered to Scholar+/Max-only by
 * changing a single line here — without touching the pipeline or UI.
 */

/**
 * Deep marking: paid users always get the second-opinion verify pass, even on
 * large multi-question scripts that free users skip to stay under the function
 * timeout. Makes "paid marking is more accurate" literally true.
 */
export function hasDeepMarking(access: EffectiveAccess): boolean {
  return hasPaidAccess(access)
}

/**
 * Rewrite-to-full-marks: an AI rewrite of the student's own answer into an
 * annotated full-marks model response, highlighting exactly what each addition
 * earns.
 */
export function hasFullMarksRewrite(access: EffectiveAccess): boolean {
  return hasPaidAccess(access)
}
