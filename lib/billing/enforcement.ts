// NOTE: server-only module. Imports the Supabase service-role client, so it
// must never be bundled into client components.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import {
  getEnforcementMode,
  shouldBlockAtCap,
  shouldShowApproachingLimitBanner,
  type EnforcementMode,
} from './enforcement-mode'
import {
  capForAccess,
  currentPeriodWindow,
  omniCapForAccess,
  TIER_MONTHLY_CAPS,
  TIER_OMNI_CAPS,
} from './caps'
import {
  ACTIVE_STATUSES,
  effectiveAccessForUser,
  isVerifiedTeacher,
  type EffectiveAccess,
} from './access'
import {
  classBonusFor,
  classBonusLookupNeeded,
  studentInVerifiedClassroom,
} from './teacher-seat'
import type {
  BillingPeriod,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/lib/database.types'
import { notifyAdminMark } from '@/lib/email/notifications'
import { runAfterResponse } from '@/lib/after-response'

export { TIER_MONTHLY_CAPS, TIER_OMNI_CAPS }

export type MarkEventType = 'mark_single' | 'mark_whole_paper'
export type OmniEventType = 'omni_message'
export type UsageEventType = MarkEventType | OmniEventType

export type AllowanceReason =
  | 'free_tier_cap'
  | 'tier_cap'
  | 'omni_cap'
  | 'no_credits'
  | 'subscription_inactive'
  // A granted teacher seat that has run out for the month. Distinct from
  // `free_tier_cap` so a teacher is never told they have used up 5 free marks
  // and shown an upgrade page for a plan smaller than the seat they already
  // have.
  | 'teacher_seat_cap'

export type QuotaAllowance = {
  allowed: boolean
  blocked_by_mode: boolean
  reason?: AllowanceReason
  remaining: number
  used: number
  cap: number
  credit_balance: number
  tier: SubscriptionTier
  status: SubscriptionStatus
  /**
   * Effective access, resolved with the teacher seat and any comp — the value
   * every feature gate on the mark path must use. Recomputing it from
   * `{tier, status}` at the call site loses the seat: that is how a verified
   * teacher held a Scholar allowance at the gate and got the free-tier
   * whole-paper preview three lines later.
   */
  access: EffectiveAccess
  period_resets_at?: string
  warning: boolean
  enforcement_mode: EnforcementMode
  /** True when the allowance came from a granted teacher seat, not a purchase. */
  teacher_seat: boolean
  /**
   * Marks a month `cap` includes from the class bonus — the student is an
   * active member of a live class whose teacher holds a verified seat
   * (./teacher-seat). Already counted in `cap`; reported separately so the
   * chip and the banner can say where those marks came from. Always 0 for
   * study chat, for teachers, and for anyone not in such a class.
   */
  class_bonus: number
}

/** Mark-specific alias — `marks_used` mirrors `used` for existing callers. */
export type MarkAllowance = QuotaAllowance & { marks_used: number }

export type BillingSummary = {
  tier: SubscriptionTier
  access: EffectiveAccess
  status: SubscriptionStatus
  credit_balance: number
  period_resets_at?: string
  enforcement_mode: EnforcementMode
  questions: QuotaAllowance
  omni: QuotaAllowance
}

export type BillingContext = {
  tier: SubscriptionTier
  /** Tier whose caps apply. */
  cap_tier: SubscriptionTier
  access: EffectiveAccess
  status: SubscriptionStatus
  /** Teacher seats are given away and metered on their own, larger allowance. */
  is_teacher: boolean
  /**
   * Marks a month added to the mark cap by the class bonus (see
   * ./teacher-seat). 0 unless the user is a student in a live class of a
   * verified teacher.
   */
  class_bonus: number
  /**
   * A paid tier whose subscription is no longer live AND nothing else (seat,
   * comp, class bonus) grants access. Such a user gets no allowance slot; a
   * credit can still cover a mark. A verified teacher or a comp with a dead
   * subscription is NOT inactive — they fall back to their seat, which is what
   * the seat is for — and neither is a lapsed subscriber in a verified
   * teacher's class, who falls back to what every free classmate has (the free
   * allowance plus the class bonus) rather than to nothing.
   */
  subscription_inactive: boolean
  credit_balance: number
  window: ReturnType<typeof currentPeriodWindow>
  enforcement_mode: EnforcementMode
}

/** The rows loadBillingContext reads, as the pure derivation below takes them. */
export type BillingContextInput = {
  userId: string
  sub: {
    tier?: string | null
    status?: string | null
    billing_period?: string | null
    current_period_start?: string | null
    current_period_end?: string | null
  } | null
  creditBalance: number | null
  /** `user_profiles.teacher_verified_at` — the grant, never the role. */
  teacherVerifiedAt: string | null
  /** `student_in_verified_classroom(userId)`. */
  inVerifiedClassroom: boolean
  enforcementMode: EnforcementMode
  /** Injectable for tests; production reads the environment. */
  classBonus?: { bonus?: number; enabled?: boolean }
  /** Injectable for tests only. */
  now?: Date
}

/**
 * Everything the gate decides from the four rows loadBillingContext reads.
 * Pure, so the cap rules — seat, comp, class bonus, lapsed subscription —
 * are testable without a database (lib/billing/teacher-seat.test.ts).
 */
export function deriveBillingContext(input: BillingContextInput): BillingContext {
  const { userId, sub } = input
  const tier = (sub?.tier ?? 'free') as SubscriptionTier
  const status = (sub?.status ?? 'active') as SubscriptionStatus
  const billingPeriod = (sub?.billing_period ?? null) as BillingPeriod | null
  // The granted seat, not the self-declared `role` column.
  const is_teacher = isVerifiedTeacher(input.teacherVerifiedAt)
  const access = effectiveAccessForUser({
    userId,
    tier,
    status,
    teacherVerifiedAt: input.teacherVerifiedAt,
  })
  const class_bonus = classBonusFor({
    inVerifiedClassroom: input.inVerifiedClassroom,
    isTeacher: is_teacher,
    ...input.classBonus,
  })
  const paidActive = tier !== 'free' && ACTIVE_STATUSES.includes(status)
  // Caps come from the ACTUAL paid tier now that Pro/Scholar/Max are distinct
  // (student=Pro, scholar=Scholar, mastery=Max); free gets free caps.
  //
  // Deliberately NOT raised by a comp. A comp grants the experience, not the
  // consumption: marking and study chat cost real money per use, and the
  // subscriber is paying Scholar for them. Keeping the cap on the paid tier is
  // also what makes the billing page stay honest — it reads the same tier, so
  // it shows Scholar and the Scholar allowance rather than quietly implying
  // they bought Max.
  //
  // A dead subscription contributes nothing: its tier is not what the user is
  // paying for, and its Polar period is not a window anything should be counted
  // in (rows written after that period ended would never be counted, so the
  // cap could never bite). A teacher with a lapsed Scholar sub is metered on
  // the seat, over the calendar month, exactly like a teacher who never paid.
  const cap_tier: SubscriptionTier = paidActive ? tier : 'free'
  return {
    tier,
    cap_tier,
    access,
    status,
    is_teacher,
    class_bonus,
    subscription_inactive: tier !== 'free' && !paidActive && access === 'free' && class_bonus === 0,
    credit_balance: input.creditBalance ?? 0,
    window: currentPeriodWindow({
      tier: paidActive ? tier : 'free',
      periodStart: sub?.current_period_start,
      periodEnd: sub?.current_period_end,
      billingPeriod,
      now: input.now,
    }),
    enforcement_mode: input.enforcementMode,
  }
}

/**
 * The monthly mark cap for a context: the tier's (or the seat's) cap plus the
 * class bonus. The one expression every gate uses — the allowance read, the
 * reservation and the extra-question backstop — so the cap the chip shows is
 * the cap `reserve_mark_usage` enforces.
 */
export function markCapFor(
  ctx: Pick<BillingContext, 'access' | 'cap_tier' | 'is_teacher' | 'class_bonus'>
): number {
  return capForAccess(ctx.access, ctx.cap_tier, ctx.is_teacher, ctx.class_bonus)
}

async function loadBillingContext(
  userId: string,
  supabase: SupabaseClient
): Promise<BillingContext> {
  const [{ data: sub }, { data: credits }, { data: profile }, inVerifiedClassroom] =
    await Promise.all([
      supabase
        .from('user_subscriptions')
        .select('tier, status, billing_period, current_period_start, current_period_end')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('user_credits').select('balance').eq('user_id', userId).maybeSingle(),
      // Fetched alongside the others rather than in a follow-up query: this runs
      // on the gate for every mark, so it must not add a round trip.
      supabase
        .from('user_profiles')
        .select('teacher_verified_at')
        .eq('id', userId)
        .maybeSingle(),
      // The class bonus, in the same round trip for the same reason. Every
      // caller passes the service client, which is the only role allowed to
      // execute this function; it answers false (no bonus) on any error.
      classBonusLookupNeeded()
        ? studentInVerifiedClassroom(supabase, userId)
        : Promise.resolve(false),
    ])

  return deriveBillingContext({
    userId,
    sub: sub ?? null,
    creditBalance: (credits?.balance as number | null | undefined) ?? null,
    teacherVerifiedAt: (profile?.teacher_verified_at as string | null | undefined) ?? null,
    inVerifiedClassroom,
    enforcementMode: getEnforcementMode(),
  })
}

async function countUsageInWindow(
  supabase: SupabaseClient,
  userId: string,
  eventTypes: UsageEventType[],
  source: 'subscription' | 'free_tier',
  start: string,
  end: string | null
): Promise<number> {
  let q = supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', source)
    .in('event_type', eventTypes)
    .gte('created_at', start)
  if (end) q = q.lt('created_at', end)
  const { count } = await q
  return count ?? 0
}

function buildQuotaAllowance(
  ctx: BillingContext,
  opts: {
    used: number
    cap: number
    omni?: boolean
  }
): QuotaAllowance {
  const {
    tier,
    status,
    access,
    credit_balance,
    window,
    enforcement_mode,
    is_teacher,
    subscription_inactive,
  } = ctx
  const remaining = Math.max(0, opts.cap - opts.used)
  const atCap = opts.used >= opts.cap

  let would_block = false
  let reason: AllowanceReason | undefined
  if (subscription_inactive && credit_balance <= 0) {
    would_block = true
    reason = 'subscription_inactive'
  } else if (atCap && credit_balance <= 0) {
    would_block = true
    reason = opts.omni
      ? 'omni_cap'
      : is_teacher
        ? 'teacher_seat_cap'
        : tier === 'free'
          ? 'free_tier_cap'
          : 'tier_cap'
  }

  const warning = opts.cap > 0 && opts.used >= 0.8 * opts.cap
  const blocked_by_mode = would_block && shouldBlockAtCap()
  const allowed = enforcement_mode === 'enforce' ? !would_block : true

  return {
    allowed,
    blocked_by_mode,
    reason,
    remaining,
    used: opts.used,
    cap: opts.cap,
    credit_balance,
    tier,
    status,
    access,
    period_resets_at: window.end ?? undefined,
    warning,
    enforcement_mode,
    teacher_seat: is_teacher,
    // Study chat has no class bonus; the mark cap carries it.
    class_bonus: opts.omni ? 0 : ctx.class_bonus,
  }
}

function asMarkAllowance(q: QuotaAllowance): MarkAllowance {
  return { ...q, marks_used: q.used }
}

async function computeQuestionAllowanceFromContext(
  userId: string,
  ctx: BillingContext,
  supabase: SupabaseClient
): Promise<QuotaAllowance> {
  const used = await countUsageInWindow(
    supabase,
    userId,
    ['mark_single', 'mark_whole_paper'],
    ctx.window.source,
    ctx.window.start,
    ctx.window.end
  )
  return buildQuotaAllowance(ctx, {
    used,
    cap: markCapFor(ctx),
  })
}

async function computeOmniAllowanceFromContext(
  userId: string,
  ctx: BillingContext,
  supabase: SupabaseClient
): Promise<QuotaAllowance> {
  const used = await countUsageInWindow(
    supabase,
    userId,
    ['omni_message'],
    ctx.window.source,
    ctx.window.start,
    ctx.window.end
  )
  return buildQuotaAllowance(ctx, {
    used,
    cap: omniCapForAccess(ctx.access, ctx.cap_tier, ctx.is_teacher),
    omni: true,
  })
}

/**
 * Pure read of question allowance. Safe for summary endpoint (no shadow log).
 */
export async function computeAllowance(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<MarkAllowance> {
  const ctx = await loadBillingContext(userId, supabase)
  const q = await computeQuestionAllowanceFromContext(userId, ctx, supabase)
  return asMarkAllowance(q)
}

export async function computeOmniAllowance(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<QuotaAllowance> {
  const ctx = await loadBillingContext(userId, supabase)
  return computeOmniAllowanceFromContext(userId, ctx, supabase)
}

/** Combined question + Omni allowances for header chip and account page. */
export async function computeBillingSummary(
  userId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<BillingSummary> {
  const ctx = await loadBillingContext(userId, supabase)
  const [questions, omni] = await Promise.all([
    computeQuestionAllowanceFromContext(userId, ctx, supabase),
    computeOmniAllowanceFromContext(userId, ctx, supabase),
  ])
  return {
    tier: ctx.tier,
    access: ctx.access,
    status: ctx.status,
    credit_balance: ctx.credit_balance,
    period_resets_at: ctx.window.end ?? undefined,
    enforcement_mode: ctx.enforcement_mode,
    questions,
    omni,
  }
}

async function recordShadowEvent(
  supabase: SupabaseClient,
  userId: string,
  allowance: QuotaAllowance,
  kind: 'mark' | 'omni'
): Promise<void> {
  const atCap = allowance.used >= allowance.cap

  let eventType: 'would_warn' | 'would_block' | 'allowed_via_credits' | null = null
  if (allowance.blocked_by_mode || allowance.reason) {
    eventType = 'would_block'
  } else if (atCap && allowance.credit_balance > 0) {
    eventType = 'allowed_via_credits'
  } else if (allowance.warning) {
    eventType = 'would_warn'
  }
  if (!eventType) return

  const { error } = await supabase.from('shadow_enforcement_log').insert({
    user_id: userId,
    event_type: eventType,
    reason: allowance.reason ?? null,
    tier: allowance.tier,
    marks_used: allowance.used,
    mark_cap: allowance.cap,
    credit_balance: allowance.credit_balance,
    enforcement_mode: allowance.enforcement_mode,
    metadata: { kind, remaining: allowance.remaining },
  })
  if (error) console.error('[enforcement] shadow log insert failed:', error.message)
}

export async function checkOmniAllowance(userId: string): Promise<QuotaAllowance> {
  const supabase = createServiceClient()
  const allowance = await computeOmniAllowance(userId, supabase)
  await recordShadowEvent(supabase, userId, allowance, 'omni')
  return allowance
}

async function recordUsageEvent(
  userId: string,
  eventType: UsageEventType,
  attemptId: string | null,
  computeQuota: (
    userId: string,
    supabase: SupabaseClient
  ) => Promise<{ allowance: QuotaAllowance; ctx: BillingContext }>
): Promise<void> {
  const supabase = createServiceClient()
  const { allowance, ctx } = await computeQuota(userId, supabase)

  const atCapOrInactive = allowance.used >= allowance.cap || ctx.subscription_inactive

  if (atCapOrInactive && allowance.credit_balance > 0) {
    const { data: spent, error } = await supabase.rpc('consume_credit', {
      p_user_id: userId,
      p_event_type: eventType,
      p_attempt_id: attemptId,
      p_metadata: { recorded_at: new Date().toISOString() },
    })
    if (error) {
      console.error('[enforcement] consume_credit failed:', error.message)
    } else if (spent === true) {
      return
    }
  }

  // The window's own source, so the row lands where the next count looks. A
  // lapsed paid tier is metered over the calendar month as free_tier (see
  // loadBillingContext); deriving the source from `tier` here put those rows
  // in a window nothing reads.
  const { error } = await supabase.from('usage_events').insert({
    user_id: userId,
    event_type: eventType,
    attempt_id: attemptId,
    credits_delta: -1,
    source: ctx.window.source,
    metadata: { recorded_at: new Date().toISOString() },
  })
  if (error) console.error('[enforcement] recordUsage insert failed:', error.message)
}

export async function recordOmniUsage(userId: string): Promise<void> {
  await recordUsageEvent(userId, 'omni_message', null, async (uid, sb) => {
    const ctx = await loadBillingContext(uid, sb)
    return { allowance: await computeOmniAllowanceFromContext(uid, ctx, sb), ctx }
  })
}

// ─── Atomic reserve-at-gate path (closes the cap-enforcement TOCTOU race) ─────
// The old design counted at the gate and inserted after the work, so concurrent
// requests could all pass the gate before any of them recorded. reserveMarkUsage()
// does the boundary count+insert atomically
// (per-user advisory lock inside the reserve_mark_usage RPC), so only `cap`
// reservations can cross the cap boundary. Over-cap rows (warn/off mode) are
// written non-atomically on purpose — the cap is already exceeded, so there is
// no boundary left to protect, and `used` must keep climbing exactly like today.
//
// Credits are held under the same lock. They used to be a balance READ at the
// gate and a `consume_credit` at finalize, after the AI work: twenty parallel
// marks at cap with one credit all read "1", all ran, and one of them spent it.
// The RPC now decrements the balance and writes a reserved credits row in the
// same transaction as the count, so the twenty-first request sees zero. A
// released reservation refunds what it held.

const MARK_EVENT_TYPES: MarkEventType[] = ['mark_single', 'mark_whole_paper']

export type MarkReservation = {
  /** Shaped allowance for the 402 body and the response chip. */
  allowance: MarkAllowance
  /** True only in 'enforce' mode when over cap with no credits. */
  blocked_by_mode: boolean
  /**
   * Handle for the reserved usage rows: the first row's id, which every other
   * row of the same reservation carries as `metadata.reservation_id`. Passed
   * to release (delete + refund) and stored on `mark_runs` so the sweep can
   * release a reservation the function died holding. Null when nothing was
   * written.
   */
  event_id: string | null
  /** Some or all of the reservation is covered by credits. */
  via_credit: boolean
  /**
   * Credits already taken from the balance at the gate (atomically, under the
   * lock). Zero on the legacy path, where the credit is consumed at finalize.
   */
  credits_held: number
  /** Marks reserved. Whole paper = 1; a multi-question script = its question count. */
  count: number
  /** Owner — the release RPC refunds credits to this account. */
  user_id: string
  /** Window source, needed by finalize's credit-race fallback. */
  source: 'subscription' | 'free_tier'
}

/**
 * How many questions of a multi-question script this reservation may MARK.
 *
 * The gate reserves one mark before the script is split (the count is only
 * known after OCR). The pipeline then marked up to its hard cap regardless,
 * and recordExtraMarkUsages refused to *write* usage rows beyond the cap —
 * but every refused question had already been derived, marked and (paid)
 * verified on Gemini Pro. A free user at 4/5 uploading a 15-question script
 * got 15 marks for 1, repeatably while a mark remained. (Code review
 * 2026-09-25, §2 "extra-question charges bypass the cap".)
 *
 * The bound is what the allowance can cover: this reservation's count plus
 * what is left in the window plus credits — `remaining` and `credit_balance`
 * come from the RPC after the reservation, so neither double-counts it.
 * Never below 1: the reserved question is paid for. Null when the allowance
 * does not bound ('warn' / 'off', where over-cap rows are written and
 * nothing is refused), so the caller applies only its hard cap.
 */
export function maxQuestionsForReservation(
  reservation: Pick<MarkReservation, 'count' | 'allowance'>
): number | null {
  const { allowance, count } = reservation
  if (allowance.enforcement_mode !== 'enforce') return null
  const remaining = Number.isFinite(allowance.remaining) ? Math.max(0, allowance.remaining) : 0
  const credits = Number.isFinite(allowance.credit_balance)
    ? Math.max(0, allowance.credit_balance)
    : 0
  return Math.max(1, Math.floor(Math.max(1, count) + remaining + credits))
}

/**
 * Thrown by the gate when the billing database cannot answer in 'enforce'
 * mode. The gate used to fail OPEN on an RPC error — "never block a user on
 * our bug" — which is the right instinct for a metering glitch and the wrong
 * one for a billing outage: every mark during the outage was free, and the
 * outage was invisible until the Gemini bill arrived. Failing closed with a
 * clear, retryable body costs a minute of marking; failing open costs the
 * month.
 *
 * Route handlers should map it to a 503 with `body`. Nothing was charged.
 *
 * `error` carries the sentence, `code` the machine name. Every 4xx/5xx body
 * the mark clients consume is displayed from `error` (the one exception,
 * `mark_quota_exceeded`, is special-cased by name), so when this body put
 * the code in `error` the student saw the literal text "billing_unavailable"
 * and the one thing the body existed to say — nothing was charged, try again
 * in a minute — never reached them. `message` is kept as a duplicate for any
 * consumer that already read it.
 */
export class BillingUnavailableError extends Error {
  readonly status = 503
  readonly body: {
    error: string
    code: 'billing_unavailable'
    message: string
    retry: true
  }
  constructor(cause: string) {
    super(
      'Marking is paused for a moment while billing recovers. Nothing was charged — please try again in a minute.'
    )
    this.name = 'BillingUnavailableError'
    this.body = {
      error: this.message,
      code: 'billing_unavailable',
      message: this.message,
      retry: true,
    }
    // Kept for logs, never sent to the client.
    Object.defineProperty(this, 'cause', { value: cause, enumerable: false })
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PostgREST filter matching every row of a reservation (see
 * MarkReservation.event_id). Null for anything that is not a uuid: the value
 * is interpolated into a filter string, where a comma would change the
 * meaning of the expression. Our own ids are uuids, so this never trips —
 * and when it somehow does, the caller logs and leaves the rows alone rather
 * than throwing after a mark has already succeeded.
 */
function reservationFilter(eventId: string): string | null {
  if (!UUID_RE.test(eventId)) return null
  return `id.eq.${eventId},metadata->>reservation_id.eq.${eventId}`
}

/**
 * Insert `count` reserved usage rows outside the RPC (fail-open fallback and
 * over-cap rows in warn/off mode). Returns the first row's id, which the
 * remaining rows reference so release can find them all. Null on error.
 */
async function insertUsageRows(
  supabase: SupabaseClient,
  userId: string,
  eventType: MarkEventType,
  source: 'subscription' | 'free_tier',
  count: number,
  extraMeta: Record<string, unknown> = {}
): Promise<string | null> {
  const row = (meta: Record<string, unknown>) => ({
    user_id: userId,
    event_type: eventType,
    attempt_id: null,
    credits_delta: -1,
    source,
    metadata: { recorded_at: new Date().toISOString(), reserved: true, ...extraMeta, ...meta },
  })
  const { data, error } = await supabase
    .from('usage_events')
    .insert(row({ reservation_count: count }))
    .select('id')
    .single()
  if (error) {
    console.error('[enforcement] usage insert failed:', error.message)
    return null
  }
  const first = (data?.id as string | undefined) ?? null
  if (first && count > 1) {
    const rest = Array.from({ length: count - 1 }, () =>
      row({ reservation_id: first, reservation_count: count, extra_question: true })
    )
    const { error: restErr } = await supabase.from('usage_events').insert(rest)
    if (restErr) console.error('[enforcement] usage insert (extra rows) failed:', restErr.message)
  }
  return first
}

/** What the reserve RPC hands back (v2 adds via_credit/credits_held/count). */
export type ReserveRpcResult = {
  reserved?: boolean
  used?: number
  event_id?: string
  via_credit?: boolean
  credits_held?: number
  count?: number
  credit_balance?: number
}

/**
 * The gate's reading of an RPC result. Pure, so the branch table is testable:
 *
 *  - reserved                → rows written (allowance and/or held credits).
 *  - not reserved, v2 RPC    → genuinely blocked: the RPC already tried credits.
 *  - not reserved, legacy    → the old RPC knows nothing about credits; a
 *                              balance covering `count` proceeds via credit,
 *                              consumed at finalize (the pre-migration race,
 *                              kept only until the migration is applied).
 */
export function interpretReserveResult(
  res: ReserveRpcResult,
  opts: { count: number; creditBalance: number; legacy: boolean }
): {
  eventId: string | null
  viaCredit: boolean
  creditsHeld: number
  used: number
  creditBalance: number
  blocked: boolean
} {
  const used = res.used ?? 0
  const creditBalance =
    typeof res.credit_balance === 'number' ? res.credit_balance : opts.creditBalance
  if (res.reserved) {
    return {
      eventId: res.event_id ?? null,
      viaCredit: res.via_credit === true,
      creditsHeld: Math.max(0, res.credits_held ?? 0),
      used,
      creditBalance,
      blocked: false,
    }
  }
  if (opts.legacy && opts.creditBalance >= opts.count) {
    return { eventId: null, viaCredit: true, creditsHeld: 0, used, creditBalance, blocked: false }
  }
  return { eventId: null, viaCredit: false, creditsHeld: 0, used, creditBalance, blocked: true }
}

type RpcError = { code?: string; message?: string }

/** PostgREST could not find a function with these arguments (migration not applied). */
function isMissingFunctionError(error: RpcError | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist/i.test(error.message ?? '')
  )
}

type ReserveArgs = {
  userId: string
  eventType: MarkEventType
  source: 'subscription' | 'free_tier'
  windowStart: string
  windowEnd: string | null
  cap: number
  count: number
}

/**
 * Call reserve_mark_usage, preferring the v2 signature (p_count, credits held
 * under the lock) and falling back to the pre-migration one when the database
 * has not been migrated yet. The fallback exists so that deploying the code
 * before applying 20260925_reserve_mark_usage_credits.sql degrades to the old
 * behaviour rather than — in 'enforce' mode — failing every mark closed.
 *
 * On the legacy path a multi-mark reservation is `count` single reservations,
 * each atomic, rolled back together if any is refused.
 */
async function callReserveRpc(
  supabase: SupabaseClient,
  args: ReserveArgs
): Promise<{ data: ReserveRpcResult | null; error: RpcError | null; legacy: boolean }> {
  const base = {
    p_user_id: args.userId,
    p_event_type: args.eventType,
    p_source: args.source,
    p_window_start: args.windowStart,
    p_window_end: args.windowEnd,
    p_cap: args.cap,
  }
  const v2 = await supabase.rpc('reserve_mark_usage', { ...base, p_count: args.count })
  if (!v2.error) return { data: (v2.data ?? {}) as ReserveRpcResult, error: null, legacy: false }
  if (!isMissingFunctionError(v2.error)) return { data: null, error: v2.error, legacy: false }

  console.warn(
    '[enforcement] reserve_mark_usage v2 not found — apply 20260925_reserve_mark_usage_credits.sql; using the legacy RPC'
  )
  const ids: string[] = []
  let used = 0
  for (let i = 0; i < args.count; i += 1) {
    const legacy = await supabase.rpc('reserve_mark_usage', base)
    if (legacy.error) {
      if (ids.length) await supabase.from('usage_events').delete().in('id', ids)
      return { data: null, error: legacy.error, legacy: true }
    }
    const res = (legacy.data ?? {}) as ReserveRpcResult
    used = res.used ?? used
    if (!res.reserved || !res.event_id) {
      if (ids.length) await supabase.from('usage_events').delete().in('id', ids)
      return { data: { reserved: false, used }, error: null, legacy: true }
    }
    ids.push(res.event_id)
  }
  if (ids.length > 1) {
    // The legacy RPC writes fixed metadata; tag the extra rows so release and
    // finalize can find the whole reservation from its first id.
    const { error } = await supabase
      .from('usage_events')
      .update({
        metadata: { recorded_at: new Date().toISOString(), reserved: true, reservation_id: ids[0] },
      })
      .in('id', ids.slice(1))
    if (error) console.error('[enforcement] legacy reservation tagging failed:', error.message)
  }
  return { data: { reserved: true, used, event_id: ids[0], count: ids.length }, error: null, legacy: true }
}

function reservationAllowance(
  ctx: BillingContext,
  opts: {
    used: number
    cap: number
    wouldBlock: boolean
    reason?: AllowanceReason
    creditBalance?: number
  }
): MarkAllowance {
  const remaining = Math.max(0, opts.cap - opts.used)
  const warning = opts.cap > 0 && opts.used >= 0.8 * opts.cap
  const blocked_by_mode = opts.wouldBlock && shouldBlockAtCap()
  const allowed = ctx.enforcement_mode === 'enforce' ? !opts.wouldBlock : true
  return asMarkAllowance({
    allowed,
    blocked_by_mode,
    reason: opts.reason,
    remaining,
    used: opts.used,
    cap: opts.cap,
    credit_balance: opts.creditBalance ?? ctx.credit_balance,
    tier: ctx.tier,
    status: ctx.status,
    access: ctx.access,
    period_resets_at: ctx.window.end ?? undefined,
    warning,
    enforcement_mode: ctx.enforcement_mode,
    teacher_seat: ctx.is_teacher,
    class_bonus: ctx.class_bonus,
  })
}

function capReason(ctx: BillingContext): AllowanceReason {
  if (ctx.subscription_inactive) return 'subscription_inactive'
  if (ctx.is_teacher) return 'teacher_seat_cap'
  return ctx.tier === 'free' ? 'free_tier_cap' : 'tier_cap'
}

/**
 * Atomic gate. Reserves `count` quota slots up front (default 1):
 *  - under cap            → RPC inserts usage rows atomically; event_id returned.
 *  - at cap, has credits  → RPC holds the credits under the same lock
 *                            (via_credit=true, credits_held=n); refunded on release.
 *  - at cap, no credits / inactive:
 *      • 'enforce'        → blocked_by_mode=true (402); nothing written.
 *      • 'warn' / 'off'   → over-limit usage rows ARE written (used keeps climbing,
 *                            faithful to today); released only if the mark fails.
 *
 * Infra errors: 'enforce' fails CLOSED (BillingUnavailableError → 503, nothing
 * charged); 'warn' / 'off' fail open with best-effort metering, since nothing
 * would have blocked anyway.
 *
 * A reservation is all-or-nothing: a 3-question script against 1 remaining
 * mark and no credits is refused, not partly charged.
 */
export async function reserveMarkUsage(
  userId: string,
  eventType: MarkEventType,
  opts: { count?: number; supabase?: SupabaseClient } = {}
): Promise<MarkReservation> {
  const supabase = opts.supabase ?? createServiceClient()
  const count = Math.max(1, Math.floor(opts.count ?? 1))
  const ctx = await loadBillingContext(userId, supabase)
  // Includes the class bonus: the raised cap is the only thing the bonus
  // changes, and it reaches the atomic RPC as p_cap like any other cap.
  const cap = markCapFor(ctx)

  const countUsed = () =>
    countUsageInWindow(
      supabase,
      userId,
      MARK_EVENT_TYPES,
      ctx.window.source,
      ctx.window.start,
      ctx.window.end
    )

  let eventId: string | null = null
  let viaCredit = false
  let creditsHeld = 0
  let used = 0
  let creditBalance = ctx.credit_balance
  let wouldBlock = false
  let reason: AllowanceReason | undefined

  // An inactive paid sub never gets an allowance slot: cap 0 sends the RPC
  // straight to credits, still under the lock.
  const { data, error, legacy } = await callReserveRpc(supabase, {
    userId,
    eventType,
    source: ctx.window.source,
    windowStart: ctx.window.start,
    windowEnd: ctx.window.end,
    cap: ctx.subscription_inactive ? 0 : cap,
    count,
  })

  if (error) {
    console.error('[enforcement] reserve_mark_usage failed:', error.message)
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureMessage(
        `reserve_mark_usage RPC failed (${ctx.enforcement_mode === 'enforce' ? 'failing closed' : 'failing open'}): ${error.message}`,
        { level: 'error', tags: { area: 'billing-enforcement' } }
      )
    } catch {
      // Sentry unavailable — console.error above is the fallback.
    }
    if (ctx.enforcement_mode === 'enforce') {
      throw new BillingUnavailableError(error.message ?? 'reserve_mark_usage failed')
    }
    // Fail OPEN: meter best-effort, never block on our infra error in a mode
    // that would not have blocked anyway.
    eventId = await insertUsageRows(supabase, userId, eventType, ctx.window.source, count, {
      fallback: true,
    })
    used = await countUsed()
  } else {
    const read = interpretReserveResult(data ?? {}, {
      count,
      creditBalance: ctx.credit_balance,
      legacy,
    })
    used = read.used
    creditBalance = read.creditBalance
    if (!read.blocked) {
      eventId = read.eventId
      viaCredit = read.viaCredit
      creditsHeld = read.creditsHeld
    } else {
      wouldBlock = true
      reason = capReason(ctx)
    }
  }

  const blockedByMode = wouldBlock && shouldBlockAtCap()

  // Over cap but PROCEEDING (warn/off, or inactive-no-credits not in enforce):
  // persist over-limit rows so `used` keeps climbing past cap exactly like
  // today. They are kept on success and deleted only if the mark fails — never
  // inserted-then-immediately-deleted.
  if (wouldBlock && !blockedByMode && !viaCredit) {
    eventId = await insertUsageRows(supabase, userId, eventType, ctx.window.source, count, {
      over_limit: true,
    })
    used += count
  }

  const allowance = reservationAllowance(ctx, { used, cap, wouldBlock, reason, creditBalance })
  await recordShadowEvent(supabase, userId, allowance, 'mark')

  return {
    allowance,
    blocked_by_mode: allowance.blocked_by_mode,
    event_id: eventId,
    via_credit: viaCredit,
    credits_held: creditsHeld,
    count,
    user_id: userId,
    source: ctx.window.source,
  }
}

/**
 * Success path: link the attempt to the reserved rows (allowance and held
 * credits alike). On the legacy path — a credit promised at the gate but not
 * yet taken — the credits are consumed here, as before the migration.
 */
export async function finalizeMarkReservation(
  userId: string,
  reservation: MarkReservation,
  attemptId: string | null,
  eventType: MarkEventType,
  supabase: SupabaseClient = createServiceClient()
): Promise<void> {
  // Admin alert on every successful mark (fire-and-forget; never blocks/throws).
  runAfterResponse('admin-mark-alert', () =>
    notifyAdminMark(supabase, userId, {
      eventType,
      viaCredit: reservation.via_credit,
    })
  )

  if (reservation.via_credit && reservation.credits_held === 0) {
    // Legacy: nothing was held at the gate. Spend the credits now, one per
    // reserved mark, and meter as a usage row whichever cannot be spent
    // (drained by a concurrent request) so the mark is still counted.
    for (let i = 0; i < reservation.count; i += 1) {
      const { data: spent, error } = await supabase.rpc('consume_credit', {
        p_user_id: userId,
        p_event_type: eventType,
        p_attempt_id: attemptId,
        p_metadata: { recorded_at: new Date().toISOString() },
      })
      if (error) {
        console.error('[enforcement] consume_credit failed:', error.message)
      } else if (spent === true) {
        continue
      }
      const { error: insErr } = await supabase.from('usage_events').insert({
        user_id: userId,
        event_type: eventType,
        attempt_id: attemptId,
        credits_delta: -1,
        source: reservation.source,
        metadata: { recorded_at: new Date().toISOString() },
      })
      if (insErr) console.error('[enforcement] credit-fallback usage insert failed:', insErr.message)
    }
    return
  }

  if (reservation.event_id && attemptId) {
    const filter = reservationFilter(reservation.event_id)
    if (!filter) {
      console.error('[enforcement] reservation id is not a uuid:', reservation.event_id)
      return
    }
    const { error } = await supabase
      .from('usage_events')
      .update({ attempt_id: attemptId })
      .eq('user_id', userId)
      .or(filter)
    if (error) console.error('[enforcement] link attempt to usage failed:', error.message)
  }
}

/**
 * Charge additional marks for a multi-question scanned script. The FIRST question
 * is settled by finalizeMarkReservation against the upfront reservation; this
 * records one more mark per EXTRA question so an N-question upload counts as N
 * marks.
 *
 * Each extra goes through the reserve RPC (count 1, under the lock), so the
 * cap is honoured: in 'enforce' mode an extra the window cannot hold and no
 * credit can cover is REFUSED, and the number actually recorded is returned.
 * It used to insert unconditionally, so a free user with one mark left could
 * upload a three-question script and use three. The proper fix is to reserve
 * the question count at the gate (`reserveMarkUsage(…, { count })`); until the
 * call sites do, this is the backstop.
 *
 * In 'warn' / 'off' an over-cap extra is written as an over-limit row, as the
 * gate does, so `used` keeps climbing.
 */
export async function recordExtraMarkUsages(
  userId: string,
  eventType: MarkEventType,
  reservation: MarkReservation,
  attemptIds: Array<string | null>,
  supabase: SupabaseClient = createServiceClient()
): Promise<number> {
  if (attemptIds.length === 0) return 0
  const ctx = await loadBillingContext(userId, supabase)
  const cap = ctx.subscription_inactive ? 0 : markCapFor(ctx)
  const meta = { recorded_at: new Date().toISOString(), extra_question: true }
  let recorded = 0

  for (const attemptId of attemptIds) {
    const { data, error, legacy } = await callReserveRpc(supabase, {
      userId,
      eventType,
      source: ctx.window.source,
      windowStart: ctx.window.start,
      windowEnd: ctx.window.end,
      cap,
      count: 1,
    })

    if (error) {
      // The work is already done and charged for; an unmetered extra is the
      // worse outcome here, so meter best-effort rather than refuse.
      console.error('[enforcement] extra mark reserve failed (metering directly):', error.message)
      const { error: insErr } = await supabase.from('usage_events').insert({
        user_id: userId,
        event_type: eventType,
        attempt_id: attemptId,
        credits_delta: -1,
        source: reservation.source,
        metadata: { ...meta, fallback: true },
      })
      if (insErr) console.error('[enforcement] extra mark usage insert failed:', insErr.message)
      else recorded += 1
      continue
    }

    const read = interpretReserveResult(data ?? {}, {
      count: 1,
      creditBalance: ctx.credit_balance,
      legacy,
    })

    if (!read.blocked && read.eventId) {
      if (attemptId) {
        await supabase
          .from('usage_events')
          .update({ attempt_id: attemptId })
          .eq('id', read.eventId)
      }
      recorded += 1
      continue
    }

    if (!read.blocked && read.viaCredit) {
      // Legacy RPC: spend the credit now.
      const { data: spent, error: creditErr } = await supabase.rpc('consume_credit', {
        p_user_id: userId,
        p_event_type: eventType,
        p_attempt_id: attemptId,
        p_metadata: meta,
      })
      if (!creditErr && spent === true) {
        ctx.credit_balance -= 1
        recorded += 1
        continue
      }
    }

    // At cap with nothing to cover it.
    if (ctx.enforcement_mode === 'enforce') {
      console.warn(
        `[enforcement] refused ${attemptIds.length - recorded} extra mark(s) over cap for ${userId}`
      )
      break
    }
    const { error: overErr } = await supabase.from('usage_events').insert({
      user_id: userId,
      event_type: eventType,
      attempt_id: attemptId,
      credits_delta: -1,
      source: reservation.source,
      metadata: { ...meta, over_limit: true },
    })
    if (overErr) console.error('[enforcement] extra mark usage insert failed:', overErr.message)
    else recorded += 1
  }

  return recorded
}

/**
 * Release a reservation by handle: delete its reserved usage rows and refund
 * any credits they held. Idempotent — the RPC deletes-returning, so a second
 * call (a route's catch and the sweep both trying) finds nothing and refunds
 * nothing. Used by the failure path below and by the mark-run sweep for runs
 * the function died holding.
 */
export async function releaseMarkReservationById(
  userId: string,
  eventId: string,
  supabase: SupabaseClient = createServiceClient()
): Promise<{ released: number; credits_refunded: number }> {
  const none = { released: 0, credits_refunded: 0 }
  const { data, error } = await supabase.rpc('release_mark_usage', {
    p_user_id: userId,
    p_event_id: eventId,
  })
  if (!error) {
    const res = (data ?? {}) as { released?: number; credits_refunded?: number }
    return { released: res.released ?? 0, credits_refunded: res.credits_refunded ?? 0 }
  }
  if (!isMissingFunctionError(error)) {
    console.error('[enforcement] release reservation failed:', error.message)
    return none
  }
  // Pre-migration database: no credits were ever held at the gate, so a plain
  // delete of the reserved rows is the whole release.
  const filter = reservationFilter(eventId)
  if (!filter) {
    console.error('[enforcement] reservation id is not a uuid:', eventId)
    return none
  }
  const { data: gone, error: delErr } = await supabase
    .from('usage_events')
    .delete()
    .eq('user_id', userId)
    .is('attempt_id', null)
    .or(filter)
    .select('id')
  if (delErr) {
    console.error('[enforcement] release reservation failed:', delErr.message)
    return none
  }
  return { released: gone?.length ?? 0, credits_refunded: 0 }
}

/** Failure path: delete the reserved usage rows (and refund held credits) so a failed mark consumes nothing. */
export async function releaseMarkReservation(
  reservation: MarkReservation,
  supabase: SupabaseClient = createServiceClient()
): Promise<void> {
  if (!reservation.event_id) return
  await releaseMarkReservationById(reservation.user_id, reservation.event_id, supabase)
}

/**
 * The `_allowance` block on a successful mark.
 *
 * `marksCharged` is what this upload cost (1 + extra questions actually
 * recorded). `questionsNotMarked` is how many questions of a multi-question
 * script were cut BEFORE marking because the allowance could not cover them
 * (maxQuestionsForReservation) — the student is told which ones were left,
 * so they can upload them once the window resets or with credits.
 * `marksRefused` is the older backstop: extra questions that WERE marked but
 * not charged because recordExtraMarkUsages found the cap reached after all
 * (a concurrent upload in the same window); the client says so rather than
 * silently showing a chip that did not move.
 */
export function allowanceForResponse(
  allowance: MarkAllowance,
  marksCharged = 1,
  opts: { marksRefused?: number; questionsNotMarked?: number } = {}
) {
  const remainingAfter = Math.max(0, allowance.remaining - marksCharged)
  return {
    warning: allowance.warning && shouldShowApproachingLimitBanner(),
    remaining_after: remainingAfter,
    cap: allowance.cap,
    tier: allowance.tier,
    credit_balance: allowance.credit_balance,
    period_resets_at: allowance.period_resets_at ?? null,
    enforcement_mode: allowance.enforcement_mode,
    marks_charged: marksCharged,
    marks_refused: Math.max(0, opts.marksRefused ?? 0),
    questions_not_marked: Math.max(0, opts.questionsNotMarked ?? 0),
  }
}

export function quotaExceededBody(allowance: MarkAllowance | QuotaAllowance) {
  return {
    error: 'mark_quota_exceeded' as const,
    reason: allowance.reason,
    tier: allowance.tier,
    // Reported rather than left for the client to reconstruct from `tier`.
    cap: allowance.cap,
    period_resets_at: allowance.period_resets_at ?? null,
    credit_balance: allowance.credit_balance,
    // How much of `cap` the student's class contributed, so the page can say
    // the cap was already raised rather than implying 5 marks was the offer.
    class_bonus: allowance.class_bonus,
    // Selling a teacher a plan smaller than the seat they were given is both
    // wrong and insulting; they are asked to get in touch instead.
    upgrade_url: allowance.teacher_seat ? '/contact' : '/pricing',
  }
}

export function omniQuotaExceededBody(allowance: QuotaAllowance) {
  return {
    error: 'omni_quota_exceeded' as const,
    reason: allowance.reason,
    tier: allowance.tier,
    cap: allowance.cap,
    period_resets_at: allowance.period_resets_at ?? null,
    credit_balance: allowance.credit_balance,
    upgrade_url: allowance.teacher_seat ? '/contact' : '/pricing',
  }
}

export { shouldShowApproachingLimitBanner }
