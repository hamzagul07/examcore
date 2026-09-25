import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

/**
 * Persisted daily caps, keyed by IP (or by user for a signed-in cap).
 *
 * Every cap here is consumed by ONE atomic RPC (`bump_rate_limit`, see
 * supabase/migrations/20260925_rate_limit_rpc.sql) at the moment the caller
 * decides to spend. The previous shape — read the counter, compare, do the
 * work, upsert count + 1 — was not atomic, and for the guest mark the upsert
 * only ran after the pipeline had finished, minutes later. N parallel guest
 * requests from one IP all read 0, all passed the `>= 1` check, and each one
 * ran derive + mark + verify on Gemini Pro. ANON_DAILY_MARK_LIMIT bounded
 * nothing. (Code review 2026-09-25, §1.7.)
 *
 * The RPC increments only while the counter is under the limit and reports
 * whether it did, so two racing callers cannot both be told "yes" for the last
 * slot. A run that consumed a slot and then failed gives it back with
 * `refund_rate_limit` (floor 0), so an outage on our side does not also cost
 * the guest their one mark of the day.
 */

/**
 * Guest marks per IP per day.
 *
 * Was 10, which inverted the entire quota ladder: a guest got ~300 marks a
 * month against 5/month for a signed-in free account and 50 for an $11
 * subscriber, so creating an account was a 60× downgrade and paying bought less
 * than clearing your cookies. Measured 2026-07-28 with 105 users and 1
 * subscriber.
 *
 * One is the taste — enough to see examiner ink land on your own words, which
 * is the moment that sells the product, and not enough to be a substitute for
 * having an account.
 */
export const ANON_DAILY_MARK_LIMIT = 1

/**
 * Guest study-chat messages per IP per day.
 *
 * Was 60, which left study chat inverted long after marks were fixed. That
 * number was never a ladder decision: it was set on 2026-07-05 as an abuse
 * guard, replacing an in-memory hourly bucket, and the 2026-07-28 ladder pass
 * above only ever looked at marks. So a guest kept ~1,800 messages a month
 * against 10/month for a signed-in free account — signing up was a 180×
 * downgrade — and six times what a $35 Max subscriber gets at 300/month.
 *
 * Five is the same "taste" judgement the mark limit makes, adjusted for the
 * fact that chat is conversational: one message cannot show what the thing
 * does, a short exchange can. Within a session the account is now strictly
 * better — 10 for the month against 5 for the day.
 *
 * Two things this deliberately accepts:
 *  - A guest returning on separate days still out-accrues the monthly free
 *    account, exactly as with marks. The daily reset makes it a poor
 *    substitute for an account, and the typical guest is one session.
 *  - The cap is per IP, so a school shares it (see the note on
 *    consumeAnonymousMarkSlot). That is why this is 5 and not 1.
 */
export const ANON_DAILY_OMNI_LIMIT = 5
const ANON_DAILY_CONTACT_LIMIT = 5
const AUTH_DAILY_CONTACT_LIMIT = 20
const DAILY_SIGNUP_LIMIT = 3

/**
 * Course teach-back and "explain more" caps.
 *
 * Both routes are unauthenticated and both cost model time on every hit
 * (teach-back is up to two Pro-class calls with no cache; explain only pays on
 * a cache miss, which is what the explain counter counts). They were guarded by
 * an in-process Map, which on Vercel is per-lambda and empty after every cold
 * start — so the "30 an hour" it promised was closer to "30 per instance per
 * hour, and a new instance is free". Guests get a per-IP daily cap; a signed-in
 * student gets a per-user one keyed as `user:<id>`, so a school on one IP does
 * not lock its logged-in students out of their own lessons.
 */
export const ANON_DAILY_TEACHBACK_LIMIT = 10
export const AUTH_DAILY_TEACHBACK_LIMIT = 60
export const ANON_DAILY_EXPLAIN_MISS_LIMIT = 30
export const AUTH_DAILY_EXPLAIN_MISS_LIMIT = 200

/**
 * Site-search analytics inserts per IP per day. The chat panel logs one row
 * per message sent, so a real session is tens, not hundreds; anything past
 * this is a script filling the table.
 */
export const DAILY_SEARCH_LOG_LIMIT = 200

/**
 * Question-detail lookups per IP per day. The preview panel fires on every
 * keystroke of the question number and a class shares an IP, so this is
 * generous — it exists to bound the mark_schemes scan a scraper could drive,
 * not to meter students.
 */
export const DAILY_QUESTION_DETAIL_LIMIT = 1000

/**
 * The counters the RPC will bump. Mirrors the allowlist inside
 * `bump_rate_limit`; a name outside it is rejected here before a round trip
 * and again in SQL, because the counter name is interpolated into a statement.
 */
export const RATE_LIMIT_COUNTERS = [
  'mark_count',
  'omni_count',
  'contact_count',
  'signup_count',
  'teachback_count',
  'explain_count',
  'search_count',
  'question_detail_count',
] as const
export type RateLimitCounter = (typeof RATE_LIMIT_COUNTERS)[number]

export function isRateLimitCounter(value: unknown): value is RateLimitCounter {
  return (
    typeof value === 'string' &&
    (RATE_LIMIT_COUNTERS as readonly string[]).includes(value)
  )
}

export type RateLimitDecision =
  | { allowed: true; count: number }
  | { allowed: false; message: string }

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function todayUtc(): string {
  return new Date().toISOString().split('T')[0]
}

/** Row key for a per-user cap: lives in the same `ip` column, never collides
 * with an address. */
export function userRateLimitKey(userId: string): string {
  return `user:${userId}`
}

/** Per-user key when signed in, per-IP key otherwise. */
export function rateLimitKey(userId: string | null, ip: string): string {
  return userId ? userRateLimitKey(userId) : ip
}

/**
 * Who a client idempotency key belongs to — the scope `mark_runs.client_scope`
 * holds. A signed-in caller's key is scoped to their user id; a guest's to a
 * hash of their IP, so a retry from the same network still dedupes without
 * the raw address ever landing on the run row.
 */
export function clientScopeKey(userId: string | null, ip: string): string {
  if (userId) return userId
  return `ip:${createHash('sha256').update(ip).digest('hex')}`
}

/**
 * What a denied caller is told. Kept in one place so the copy — which sells
 * the account at exactly the moment it is worth having — is not scattered
 * across seven routes.
 */
export function rateLimitMessage(
  counter: RateLimitCounter,
  signedIn: boolean
): string {
  switch (counter) {
    case 'mark_count':
      // Sells the next step rather than saying "come back tomorrow" — the
      // student is standing at the exact moment the account is worth having,
      // with a marked script on screen they are about to lose.
      return 'That was your free guest mark. Create a free account to keep it — no card required.'
    case 'omni_count':
      return 'Daily chat limit reached for guests. Create a free account for your own quota, or try again tomorrow.'
    case 'contact_count':
      return signedIn
        ? 'Too many messages sent today from this network. Email us directly or try again tomorrow.'
        : 'Too many messages sent today. Email us directly or try again tomorrow.'
    case 'signup_count':
      return 'Too many signup attempts from this network today. Try again tomorrow.'
    case 'teachback_count':
      return signedIn
        ? 'Daily teach-back limit reached. Try again tomorrow.'
        : 'Daily teach-back limit reached for guests. Create a free account for a bigger daily allowance, or try again tomorrow.'
    case 'explain_count':
      return signedIn
        ? 'Too many new explanations requested today. Try again tomorrow.'
        : 'Too many new explanations requested today. Create a free account for a bigger daily allowance, or try again tomorrow.'
    case 'search_count':
      return 'Too many searches from this network today.'
    case 'question_detail_count':
      return 'Too many question lookups from this network today. Try again tomorrow.'
  }
}

/** The limiter could not be consulted. Distinct from "denied" so a route can
 * answer 500-retryable rather than "come back tomorrow". */
export class RateLimitUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitUnavailableError'
  }
}

/**
 * PostgREST's "no such function" — the migration has not been applied to this
 * database yet. Anything else is a real outage.
 */
function isMissingRpcError(error: { code?: string; message?: string }): boolean {
  if (error.code === 'PGRST202' || error.code === '42883') return true
  const message = error.message ?? ''
  return /could not find the function|function .* does not exist/i.test(message)
}

let warnedLegacyPath = false

/**
 * Consume one slot of `counter` for `key` today.
 *
 * Returns `allowed: false` — without incrementing — when the counter is
 * already at `limit`. Throws RateLimitUnavailableError when the database
 * cannot be reached, so the caller fails the request as an outage rather than
 * either waving it through (unbounded spend) or telling the student to come
 * back tomorrow (a lie).
 */
export async function bumpRateLimit(
  supabase: SupabaseClient,
  key: string,
  counter: RateLimitCounter,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  if (!isRateLimitCounter(counter)) {
    throw new Error(`bumpRateLimit: unknown counter ${String(counter)}`)
  }
  const today = todayUtc()
  const { data, error } = await supabase.rpc('bump_rate_limit', {
    p_ip: key,
    p_date: today,
    p_counter: counter,
    p_limit: limit,
  })

  if (error) {
    if (isMissingRpcError(error)) {
      // Deploy-before-migrate window. Fall back to the old read → upsert so
      // the cap still exists, and say so once per process rather than once
      // per request.
      if (!warnedLegacyPath) {
        warnedLegacyPath = true
        console.warn(
          '[rate-limit] bump_rate_limit RPC missing; using non-atomic fallback. Apply 20260925_rate_limit_rpc.sql.'
        )
      }
      return legacyBump(supabase, key, today, counter, limit)
    }
    console.error('[rate-limit] bump failed', { counter, message: error.message })
    throw new RateLimitUnavailableError(`rate limit unavailable: ${error.message}`)
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed?: boolean; count?: number }
    | null
    | undefined
  if (!row || typeof row.allowed !== 'boolean') {
    throw new RateLimitUnavailableError('rate limit RPC returned no row')
  }
  return { allowed: row.allowed, count: Number(row.count ?? 0) }
}

/** The pre-RPC path: only reached when the function is not installed. */
async function legacyBump(
  supabase: SupabaseClient,
  key: string,
  today: string,
  counter: RateLimitCounter,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  const { data: existing } = await supabase
    .from('rate_limits')
    .select(counter)
    .eq('ip', key)
    .eq('date', today)
    .maybeSingle()
  const current = Number((existing as Record<string, unknown> | null)?.[counter] ?? 0)
  if (current >= limit) return { allowed: false, count: current }
  await supabase
    .from('rate_limits')
    .upsert({ ip: key, date: today, [counter]: current + 1 }, { onConflict: 'ip,date' })
  return { allowed: true, count: current + 1 }
}

/**
 * Give a slot back. Best-effort and never throws: this runs on failure paths,
 * where a second failure has nothing useful to add.
 */
export async function refundRateLimit(
  supabase: SupabaseClient,
  key: string,
  counter: RateLimitCounter
): Promise<void> {
  if (!isRateLimitCounter(counter)) return
  try {
    const { error } = await supabase.rpc('refund_rate_limit', {
      p_ip: key,
      p_date: todayUtc(),
      p_counter: counter,
    })
    if (error && !isMissingRpcError(error)) {
      console.warn('[rate-limit] refund failed', { counter, message: error.message })
    }
  } catch (err) {
    console.warn('[rate-limit] refund threw', err)
  }
}

/** Consume-or-deny with the counter's own message. */
async function consumeDailySlot(
  supabase: SupabaseClient,
  key: string,
  counter: RateLimitCounter,
  limit: number,
  signedIn: boolean
): Promise<RateLimitDecision> {
  const result = await bumpRateLimit(supabase, key, counter, limit)
  if (!result.allowed) {
    return { allowed: false, message: rateLimitMessage(counter, signedIn) }
  }
  return { allowed: true, count: result.count }
}

// ---------------------------------------------------------------------------
// Guest marks
// ---------------------------------------------------------------------------

/**
 * Take the guest's mark slot for today, before any model call.
 *
 * IP-based daily cap applies to anonymous users only. Signed-in users rely on
 * subscription/credit quotas instead — avoids shared school Wi‑Fi blocking
 * legitimate students. Pair with refundAnonymousMarkSlot on any failure after
 * this returns `allowed`.
 */
export async function consumeAnonymousMarkSlot(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitDecision> {
  if (userId) return { allowed: true, count: 0 }
  return consumeDailySlot(supabase, ip, 'mark_count', ANON_DAILY_MARK_LIMIT, false)
}

export async function refundAnonymousMarkSlot(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<void> {
  if (userId) return
  await refundRateLimit(supabase, ip, 'mark_count')
}

/**
 * Legacy name for consumeAnonymousMarkSlot, kept for the whole-paper routes.
 *
 * It CONSUMES the slot. It used to be a plain read with the increment left to
 * incrementAnonymousMarkRateLimit, and that gap is the race this file exists
 * to close. Every caller already called the two back to back, so folding the
 * increment into the check changes nothing for them except that it now works
 * under concurrency.
 */
export async function checkAnonymousMarkRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitDecision> {
  return consumeAnonymousMarkSlot(supabase, ip, userId)
}

/**
 * No-op. The slot is consumed by checkAnonymousMarkRateLimit; this stays so
 * existing call sites keep compiling until they move to consume/refund.
 */
export async function incrementAnonymousMarkRateLimit(
  _supabase: SupabaseClient,
  _ip: string,
  _userId: string | null,
  _currentCount: number
): Promise<void> {
  /* consumed by the check */
}

// ---------------------------------------------------------------------------
// Guest Omni chat
// ---------------------------------------------------------------------------

/**
 * Guest Omni-chat daily cap — persisted in the same IP/day bucket as guest
 * marks, so it survives deploys and is shared across serverless instances
 * (unlike the in-memory hourly burst guard in the route). Signed-in users are
 * metered by their account quota instead. Consumes the slot.
 */
export async function checkAnonymousOmniRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitDecision> {
  if (userId) return { allowed: true, count: 0 }
  return consumeDailySlot(supabase, ip, 'omni_count', ANON_DAILY_OMNI_LIMIT, false)
}

/** No-op: consumed by checkAnonymousOmniRateLimit. */
export async function incrementAnonymousOmniRateLimit(
  _supabase: SupabaseClient,
  _ip: string,
  _userId: string | null,
  _currentCount: number
): Promise<void> {
  /* consumed by the check */
}

// ---------------------------------------------------------------------------
// Contact / signup spam guards
// ---------------------------------------------------------------------------

/**
 * Contact form spam guard — IP + day bucket shared with mark limits.
 * Signed-in users get a higher cap but are still limited. Consumes the slot:
 * an attempt counts whether or not the message is then saved.
 */
export async function checkContactRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitDecision> {
  const limit = userId ? AUTH_DAILY_CONTACT_LIMIT : ANON_DAILY_CONTACT_LIMIT
  return consumeDailySlot(supabase, ip, 'contact_count', limit, !!userId)
}

/** No-op: consumed by checkContactRateLimit. */
export async function incrementContactRateLimit(
  _supabase: SupabaseClient,
  _ip: string,
  _currentCount: number
): Promise<void> {
  /* consumed by the check */
}

/** Early-access waitlist — strict IP cap to prevent spam signups. Consumes. */
export async function checkSignupRateLimit(
  supabase: SupabaseClient,
  ip: string
): Promise<RateLimitDecision> {
  return consumeDailySlot(supabase, ip, 'signup_count', DAILY_SIGNUP_LIMIT, false)
}

/** No-op: consumed by checkSignupRateLimit. */
export async function incrementSignupRateLimit(
  _supabase: SupabaseClient,
  _ip: string,
  _currentCount: number
): Promise<void> {
  /* consumed by the check */
}

// ---------------------------------------------------------------------------
// Course routes — per-user when signed in, per-IP for guests
// ---------------------------------------------------------------------------

export async function consumeTeachBackSlot(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitDecision> {
  return consumeDailySlot(
    supabase,
    rateLimitKey(userId, ip),
    'teachback_count',
    userId ? AUTH_DAILY_TEACHBACK_LIMIT : ANON_DAILY_TEACHBACK_LIMIT,
    !!userId
  )
}

/** Counted on cache misses only — a hit costs nothing and is not metered. */
export async function consumeExplainMissSlot(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<RateLimitDecision> {
  return consumeDailySlot(
    supabase,
    rateLimitKey(userId, ip),
    'explain_count',
    userId ? AUTH_DAILY_EXPLAIN_MISS_LIMIT : ANON_DAILY_EXPLAIN_MISS_LIMIT,
    !!userId
  )
}

// ---------------------------------------------------------------------------
// Unauthenticated read/log endpoints — bound the table, not the student
// ---------------------------------------------------------------------------

export async function consumeSearchLogSlot(
  supabase: SupabaseClient,
  ip: string
): Promise<RateLimitDecision> {
  return consumeDailySlot(supabase, ip, 'search_count', DAILY_SEARCH_LOG_LIMIT, false)
}

export async function consumeQuestionDetailSlot(
  supabase: SupabaseClient,
  ip: string
): Promise<RateLimitDecision> {
  return consumeDailySlot(
    supabase,
    ip,
    'question_detail_count',
    DAILY_QUESTION_DETAIL_LIMIT,
    false
  )
}
