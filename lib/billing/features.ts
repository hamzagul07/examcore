import type { EffectiveAccess } from './access'

/**
 * The paid check to gate features on. Any Polar subscription still reporting
 * status `trialing` from before checkout trials were removed keeps its paid
 * tier here rather than being locked out mid-period.
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

/**
 * Quick check ("produce, then compare") is free for everyone.
 *
 * It is a retrieval-practice aid with no marginal cost — no AI call, nothing
 * leaves the browser, attempts live in localStorage. Gating it earned nothing
 * and removed the one place in a lesson where a free reader has to *produce*
 * rather than read. It is also the natural bridge to marking: a student who has
 * just written three answers is far closer to attempting a real question.
 *
 * Flip to `false` to move it back behind Pro/Max — that single change re-gates
 * the lesson section and its table-of-contents entry.
 */
export const QUICK_CHECK_FREE = true

/**
 * Whether the content gate BLOCKS the page for signed-out visitors.
 *
 * It used to. GuestSignupGate returned the signup panel *instead of* its
 * children, so a first-time visitor arriving from search saw no lesson at all —
 * just a modal asking for an account before they had any reason to want one.
 * That sat on course lessons and past-paper topic pages, which is where the
 * majority of sessions land.
 *
 * Now the content always renders and the account is asked for once the reader
 * has something worth saving (see GuestSavePrompt). Flip to `true` to restore
 * the hard wall.
 */
export const CONTENT_GATE_BLOCKS = false

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
