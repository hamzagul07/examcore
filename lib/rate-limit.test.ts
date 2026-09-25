import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * A minimal stand-in for the service client: records RPC calls and answers
 * them from a script, and supports the read → upsert shape the legacy
 * fallback uses when the RPC is not installed.
 */
type RpcCall = { fn: string; args: Record<string, unknown> }

function fakeSupabase(opts: {
  rpc?: (fn: string, args: Record<string, unknown>) => { data?: unknown; error?: unknown }
  legacyRow?: Record<string, number> | null
}) {
  const calls: RpcCall[] = []
  const upserts: Array<Record<string, unknown>> = []
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args })
      const result = opts.rpc?.(fn, args) ?? { data: null, error: null }
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null })
    },
    from() {
      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        maybeSingle() {
          return Promise.resolve({ data: opts.legacyRow ?? null, error: null })
        },
        upsert(row: Record<string, unknown>) {
          upserts.push(row)
          return Promise.resolve({ data: null, error: null })
        },
      }
    },
  }
  return { client: client as unknown as SupabaseClient, calls, upserts }
}

async function main() {
  const {
    ANON_DAILY_MARK_LIMIT,
    RATE_LIMIT_COUNTERS,
    RateLimitUnavailableError,
    bumpRateLimit,
    clientScopeKey,
    consumeAnonymousMarkSlot,
    consumeTeachBackSlot,
    isRateLimitCounter,
    rateLimitKey,
    rateLimitMessage,
    refundAnonymousMarkSlot,
    refundRateLimit,
    todayUtc,
    userRateLimitKey,
  } = await import('./rate-limit')

  // ── Counter allowlist ────────────────────────────────────────────────────
  for (const counter of RATE_LIMIT_COUNTERS) {
    assert.ok(isRateLimitCounter(counter), `${counter} is a counter`)
  }
  assert.equal(isRateLimitCounter('id'), false, 'a real column outside the list is refused')
  assert.equal(isRateLimitCounter('mark_count; drop table'), false)
  assert.equal(isRateLimitCounter(null), false)
  await assert.rejects(
    () => bumpRateLimit(fakeSupabase({}).client, '1.2.3.4', 'ip' as never, 5),
    /unknown counter/,
    'an unlisted counter never reaches the database'
  )

  // ── Keys ─────────────────────────────────────────────────────────────────
  assert.equal(userRateLimitKey('u1'), 'user:u1')
  assert.equal(rateLimitKey('u1', '1.2.3.4'), 'user:u1', 'signed in → per-user key')
  assert.equal(rateLimitKey(null, '1.2.3.4'), '1.2.3.4', 'guest → per-IP key')

  assert.equal(clientScopeKey('u1', '1.2.3.4'), 'u1', 'a user scopes their own keys')
  const guestScope = clientScopeKey(null, '1.2.3.4')
  assert.match(guestScope, /^ip:[0-9a-f]{64}$/, 'a guest scope is a hash, not the address')
  assert.equal(guestScope, clientScopeKey(null, '1.2.3.4'), 'stable for the same IP')
  assert.notEqual(guestScope, clientScopeKey(null, '1.2.3.5'))

  // ── Message selection ────────────────────────────────────────────────────
  assert.match(rateLimitMessage('mark_count', false), /free guest mark/)
  assert.match(rateLimitMessage('contact_count', true), /from this network/)
  assert.doesNotMatch(rateLimitMessage('contact_count', false), /from this network/)
  assert.match(rateLimitMessage('teachback_count', false), /Create a free account/)
  assert.doesNotMatch(rateLimitMessage('teachback_count', true), /Create a free account/)
  assert.match(rateLimitMessage('explain_count', false), /Create a free account/)
  for (const counter of RATE_LIMIT_COUNTERS) {
    assert.ok(rateLimitMessage(counter, false).length > 10, `${counter} has guest copy`)
    assert.ok(rateLimitMessage(counter, true).length > 10, `${counter} has signed-in copy`)
  }

  // ── RPC path: allowed ────────────────────────────────────────────────────
  {
    const fake = fakeSupabase({
      rpc: () => ({ data: [{ allowed: true, count: 1 }] }),
    })
    const decision = await consumeAnonymousMarkSlot(fake.client, '1.2.3.4', null)
    assert.deepEqual(decision, { allowed: true, count: 1 })
    assert.equal(fake.calls.length, 1)
    assert.equal(fake.calls[0].fn, 'bump_rate_limit')
    assert.deepEqual(fake.calls[0].args, {
      p_ip: '1.2.3.4',
      p_date: todayUtc(),
      p_counter: 'mark_count',
      p_limit: ANON_DAILY_MARK_LIMIT,
    })
    assert.equal(fake.upserts.length, 0, 'the RPC path never upserts')
  }

  // ── RPC path: denied carries the counter's message, no increment ─────────
  {
    const fake = fakeSupabase({
      rpc: () => ({ data: [{ allowed: false, count: 1 }] }),
    })
    const decision = await consumeAnonymousMarkSlot(fake.client, '1.2.3.4', null)
    assert.equal(decision.allowed, false)
    assert.match((decision as { message: string }).message, /free guest mark/)
  }

  // ── A single-object RPC payload is accepted too ──────────────────────────
  {
    const fake = fakeSupabase({ rpc: () => ({ data: { allowed: true, count: 3 } }) })
    assert.deepEqual(await bumpRateLimit(fake.client, 'k', 'omni_count', 5), {
      allowed: true,
      count: 3,
    })
  }

  // ── Signed-in callers never touch the guest mark bucket ──────────────────
  {
    const fake = fakeSupabase({ rpc: () => ({ data: [{ allowed: false, count: 9 }] }) })
    assert.deepEqual(await consumeAnonymousMarkSlot(fake.client, '1.2.3.4', 'u1'), {
      allowed: true,
      count: 0,
    })
    await refundAnonymousMarkSlot(fake.client, '1.2.3.4', 'u1')
    assert.equal(fake.calls.length, 0, 'no RPC for a signed-in user')
  }

  // ── Per-user cap keys the row as user:<id> with the signed-in limit ──────
  {
    const fake = fakeSupabase({ rpc: () => ({ data: [{ allowed: true, count: 1 }] }) })
    await consumeTeachBackSlot(fake.client, '1.2.3.4', 'u1')
    assert.equal(fake.calls[0].args.p_ip, 'user:u1')
    assert.equal(fake.calls[0].args.p_counter, 'teachback_count')
    assert.equal(fake.calls[0].args.p_limit, 60)
    await consumeTeachBackSlot(fake.client, '1.2.3.4', null)
    assert.equal(fake.calls[1].args.p_ip, '1.2.3.4')
    assert.equal(fake.calls[1].args.p_limit, 10)
  }

  // ── Refund ───────────────────────────────────────────────────────────────
  {
    const fake = fakeSupabase({ rpc: () => ({ data: 0 }) })
    await refundAnonymousMarkSlot(fake.client, '1.2.3.4', null)
    assert.equal(fake.calls[0].fn, 'refund_rate_limit')
    assert.equal(fake.calls[0].args.p_counter, 'mark_count')
    // A failing refund is logged, never thrown — it runs on failure paths.
    const broken = fakeSupabase({ rpc: () => ({ error: { message: 'boom' } }) })
    await refundRateLimit(broken.client, 'k', 'mark_count')
  }

  // ── Missing RPC (migration not applied) falls back to read → upsert ──────
  {
    const fake = fakeSupabase({
      rpc: () => ({
        error: { code: 'PGRST202', message: 'Could not find the function public.bump_rate_limit' },
      }),
      legacyRow: { mark_count: 0 },
    })
    const decision = await bumpRateLimit(fake.client, '1.2.3.4', 'mark_count', 1)
    assert.deepEqual(decision, { allowed: true, count: 1 })
    assert.equal(fake.upserts.length, 1)
    assert.deepEqual(fake.upserts[0], { ip: '1.2.3.4', date: todayUtc(), mark_count: 1 })

    const atCap = fakeSupabase({
      rpc: () => ({ error: { code: 'PGRST202', message: 'Could not find the function' } }),
      legacyRow: { mark_count: 1 },
    })
    assert.deepEqual(await bumpRateLimit(atCap.client, '1.2.3.4', 'mark_count', 1), {
      allowed: false,
      count: 1,
    })
    assert.equal(atCap.upserts.length, 0, 'denied → no write')
  }

  // ── Any other RPC error is an outage, not a denial and not a pass ────────
  {
    const fake = fakeSupabase({
      rpc: () => ({ error: { code: '57P01', message: 'terminating connection' } }),
    })
    await assert.rejects(
      () => consumeAnonymousMarkSlot(fake.client, '1.2.3.4', null),
      (err: unknown) => err instanceof RateLimitUnavailableError
    )
    const empty = fakeSupabase({ rpc: () => ({ data: [] }) })
    await assert.rejects(
      () => bumpRateLimit(empty.client, 'k', 'mark_count', 1),
      (err: unknown) => err instanceof RateLimitUnavailableError
    )
  }

  console.log('rate-limit: all assertions passed')
}

void main()
