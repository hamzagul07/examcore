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

/**
 * Whole-paper marking is a Scholar feature, so Starter gets the same preview
 * slice as Free rather than the full script — which is what both the plan card
 * and the comparison matrix have always said it gets.
 */
export function wholePaperQuestionLimit(access: EffectiveAccess): number {
  return hasScholarFeatures(access)
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

/**
 * Scholar and above — the features Starter does NOT buy.
 *
 * The line that separates the $5.99 plan from the $19.99 one. Without it every
 * paid gate was `access !== 'free'`, so Starter reached whole-paper marking,
 * the course library and the mastery matrix — everything Scholar sells except
 * the mark cap — while the pricing page showed all three as excluded. That made
 * the comparison table wrong at the point of sale and left Scholar charging
 * 3.3x for allowance alone.
 *
 * Teacher seats resolve to `scholar` (see ./access), so a teacher marking a
 * class set keeps whole papers. That is the whole reason the seat was moved off
 * `pro`.
 */
export function hasScholarFeatures(access: EffectiveAccess): boolean {
  return access === 'scholar' || access === 'max'
}

/*
 * Max-only exclusives. Scholar/Starter keep shared paid features above; these
 * add on top so Max feels given-to without stripping the middle tier.
 */

export function isMax(access: EffectiveAccess): boolean {
  return access === 'max'
}

/** Max Resource Vault — personalised packs, curated links, tools hub. */
export function hasMaxResourceVault(access: EffectiveAccess): boolean {
  return access === 'max'
}

/*
 * Vault access, by scope rather than by quantity.
 *
 * Scholar is sold as "one subject, done properly" and Max as "every subject you
 * take". So Scholar gets the real Vault — the same desk, packs and briefs — for
 * a single focus subject, rather than a thinner version of all of them. That
 * makes the upgrade an expansion (you picked up a second subject) instead of a
 * punishment (you ran out), which is the only upgrade prompt that does not land
 * hardest right before exams.
 */

/** Anyone who can open the Vault at all. */
export function hasResourceVault(access: EffectiveAccess): boolean {
  return access === 'max' || access === 'scholar'
}

/**
 * How many subjects the Vault will build a desk for. `null` means no limit.
 * Scholar is capped at its focus subject; everything else that can open the
 * Vault gets the full shelf.
 */
export function vaultSubjectLimit(access: EffectiveAccess): number | null {
  return access === 'scholar' ? 1 : null
}

/** Whether the Vault should offer a subject switcher, or lock to the focus. */
export function canSwitchVaultSubject(access: EffectiveAccess): boolean {
  return vaultSubjectLimit(access) === null
}

/**
 * Priority deep marking: Max gets higher per-question concurrency (and
 * whole-paper batch size 2) so the same paid verify depth finishes sooner.
 * Verify itself stays `isPaid` — Pro/Scholar keep the second-opinion pass.
 */
export function hasPriorityMarking(access: EffectiveAccess): boolean {
  return access === 'max'
}

/** Full weekly examiner coach email is a Max ritual. */
export function hasMaxWeeklyCoach(access: EffectiveAccess): boolean {
  return access === 'max'
}

/**
 * The first mark a signed-in student ever runs is marked as if they were paid:
 * second-opinion verify pass and rewrite-to-full-marks, both normally Pro+.
 *
 * Why this rather than another trial. Two timed trials have been built and
 * removed (20260705, then 20260807 after 194 accounts produced 2 subscribers),
 * so a third would be the same experiment with the same answer. A timer sells
 * "you have 7 days left", which is a deadline; this sells "the thing you just
 * held is not what you get next time", which is a comparison the student makes
 * with their own script in front of them. Loss frames convert roughly twice as
 * hard as gain frames, and this is the only version of one the product can run
 * without a countdown.
 *
 * It costs one extra verify pass and one rewrite per account, once, and only
 * for accounts that reach a first mark at all — measured over 60 days that is
 * 17 people. The upside is that the premium tier stops being invisible: today
 * every premium feature is gated behind a subscription nobody has bought, so
 * literally no user has ever seen one.
 *
 * Deliberately not extended to guests. A guest has no record to lose and no
 * account to come back to, so the loss frame has nothing to bite on — and the
 * guest allowance is one mark a day, which would make every guest mark premium.
 */
export function hasFirstMarkPremium(opts: {
  access: EffectiveAccess
  /** False for guests — the boost is an account benefit. */
  signedIn: boolean
  /** No attempt has ever been recorded for this account. */
  isFirstEverMark: boolean
}): boolean {
  if (!opts.signedIn || !opts.isFirstEverMark) return false
  // Paid users already have both features; saying "yes" here would be harmless
  // but would also label their result as a one-off, which is a lie.
  return !hasPaidAccess(opts.access)
}

/**
 * Early-access surfaces. Only light up UI when a real experimental flag is set
 * so we never advertise empty early access.
 */
export function hasEarlyAccess(access: EffectiveAccess): boolean {
  return access === 'max'
}

/** One-time welcome gift granted on Max (mastery) activation. */
export const MAX_WELCOME_BONUS_CREDITS = 25

/** One-time exam-sprint gift when exam_date is within 14 days. */
export const MAX_SPRINT_BONUS_CREDITS = 15

/** Days before exam_date when the Max sprint pack unlocks. */
export const MAX_SPRINT_WINDOW_DAYS = 14
