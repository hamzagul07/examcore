import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  JOIN_FAILURES_PER_WINDOW,
  JOIN_FAILURE_WINDOW_SECONDS,
  JOIN_RATE_LIMIT_MESSAGE,
  JoinGuardUnavailableError,
  checkJoinGuard,
  hashJoinIp,
  isMissingTableError,
  joinLookupAllowed,
  joinWindowStart,
  recordJoinFailure,
} from '@/lib/teacher/join-attempts'

// --- pure pieces -----------------------------------------------------------------

assert.equal(hashJoinIp('203.0.113.7'), hashJoinIp('203.0.113.7'), 'stable across calls (and instances)')
assert.notEqual(hashJoinIp('203.0.113.7'), hashJoinIp('203.0.113.8'))
assert.match(hashJoinIp('203.0.113.7'), /^[0-9a-f]{64}$/, 'sha256 hex; the raw address never reaches the table')
assert.equal(hashJoinIp(''), hashJoinIp('unknown'), 'a missing address still buckets somewhere')

assert.equal(joinLookupAllowed(0), true)
assert.equal(joinLookupAllowed(JOIN_FAILURES_PER_WINDOW - 1), true, 'the last slot is usable')
assert.equal(joinLookupAllowed(JOIN_FAILURES_PER_WINDOW), false, 'at the limit, refused')
assert.equal(joinLookupAllowed(500), false)
assert.equal(joinLookupAllowed(3, 3), false, 'limit is a parameter')

{
  const now = new Date('2026-09-25T12:00:00.000Z')
  assert.equal(joinWindowStart(now), '2026-09-25T11:00:00.000Z')
  assert.equal(JOIN_FAILURE_WINDOW_SECONDS, 3600, 'a sliding hour')
}

assert.equal(isMissingTableError({ code: '42P01', message: 'relation "x" does not exist' }), true)
assert.equal(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.x' in the schema cache" }), true)
assert.equal(isMissingTableError({ message: 'relation "public.classroom_join_attempts" does not exist' }), true)
assert.equal(isMissingTableError({ code: '57P01', message: 'terminating connection' }), false)
assert.equal(isMissingTableError(null), false)

// --- the database paths, against a recording fake --------------------------------

async function main() {

  type Call = { table: string; op: string; filters: Array<[string, string, unknown]>; payload?: unknown }

  function fakeClient(opts: {
    count?: number | null
    countError?: { code?: string; message: string } | null
    insertError?: { code?: string; message: string } | null
  }) {
    const calls: Call[] = []
    const builder = (table: string, op: string, payload?: unknown) => {
      const call: Call = { table, op, filters: [], payload }
      calls.push(call)
      const result =
        op === 'select'
          ? { count: opts.count ?? 0, error: opts.countError ?? null, data: null }
          : op === 'insert'
            ? { error: opts.insertError ?? null, data: null }
            : { error: null, data: null }
      const chain: Record<string, unknown> = {
        then: (resolve: (v: unknown) => void) => resolve(result),
      }
      for (const f of ['eq', 'gte', 'lt']) {
        chain[f] = (col: string, value: unknown) => {
          call.filters.push([f, col, value])
          return chain
        }
      }
      return chain
    }
    const client = {
      from: (table: string) => ({
        select: (_cols: string, _opts?: unknown) => builder(table, 'select'),
        insert: (payload: unknown) => builder(table, 'insert', payload),
        delete: () => builder(table, 'delete'),
      }),
    }
    return { client: client as unknown as SupabaseClient, calls }
  }

  const now = new Date('2026-09-25T12:00:00.000Z')
  const ip = '198.51.100.23'

  // Under the limit: allowed, and the query is scoped to this address and the window.
  {
    const { client, calls } = fakeClient({ count: 3 })
    const decision = await checkJoinGuard(client, ip, now)
    assert.deepEqual(decision, { allowed: true, failures: 3 })
    assert.equal(calls.length, 1, 'a check is read-only — a hit is free')
    assert.equal(calls[0]!.table, 'classroom_join_attempts')
    assert.deepEqual(calls[0]!.filters, [
      ['eq', 'ip_hash', hashJoinIp(ip)],
      ['gte', 'created_at', '2026-09-25T11:00:00.000Z'],
    ])
  }

  // At the limit: refused with the student-facing message.
  {
    const { client } = fakeClient({ count: JOIN_FAILURES_PER_WINDOW })
    const decision = await checkJoinGuard(client, ip, now)
    assert.equal(decision.allowed, false)
    if (decision.allowed) throw new Error('unreachable')
    assert.equal(decision.message, JOIN_RATE_LIMIT_MESSAGE)
    assert.equal(decision.failures, JOIN_FAILURES_PER_WINDOW)
  }

  // A null count (PostgREST omits it on some errors) reads as zero, not as denied.
  {
    const { client } = fakeClient({ count: null })
    assert.deepEqual(await checkJoinGuard(client, ip, now), { allowed: true, failures: 0 })
  }

  // Deploy-before-migrate: table missing → allowed (pre-fix behaviour), warned once.
  {
    const warnings: unknown[] = []
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnings.push(args)
    }
    try {
      const { client } = fakeClient({ countError: { code: '42P01', message: 'relation "public.classroom_join_attempts" does not exist' } })
      assert.deepEqual(await checkJoinGuard(client, ip, now), { allowed: true, failures: 0 })
      await checkJoinGuard(client, ip, now)
      assert.equal(warnings.length, 1, 'warned once per process, not once per request')
    } finally {
      console.warn = origWarn
    }
  }

  // Any other database error is an outage: throw, so the route answers 503
  // rather than waving the caller through or telling a student they are blocked.
  {
    const origError = console.error
    console.error = () => {}
    try {
      const { client } = fakeClient({ countError: { code: '57P01', message: 'terminating connection due to administrator command' } })
      await assert.rejects(() => checkJoinGuard(client, ip, now), JoinGuardUnavailableError)
    } finally {
      console.error = origError
    }
  }

  // Recording a miss inserts the hashed row and prunes this address's aged-out rows.
  {
    const { client, calls } = fakeClient({})
    await recordJoinFailure(client, ip, now)
    assert.equal(calls.length, 2)
    assert.equal(calls[0]!.op, 'insert')
    assert.deepEqual(calls[0]!.payload, { ip_hash: hashJoinIp(ip), created_at: '2026-09-25T12:00:00.000Z' })
    assert.equal(calls[1]!.op, 'delete')
    assert.deepEqual(calls[1]!.filters, [
      ['eq', 'ip_hash', hashJoinIp(ip)],
      ['lt', 'created_at', '2026-09-25T11:00:00.000Z'],
    ])
  }

  // Recording never throws — it runs on the 404 path where the answer is already
  // decided — and does not prune when the insert failed.
  {
    const origError = console.error
    console.error = () => {}
    try {
      const { client, calls } = fakeClient({ insertError: { code: '57P01', message: 'boom' } })
      await recordJoinFailure(client, ip, now)
      assert.equal(calls.length, 1, 'no prune after a failed insert')
    } finally {
      console.error = origError
    }
  }

  console.log('join-attempts.test.ts — all assertions passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
