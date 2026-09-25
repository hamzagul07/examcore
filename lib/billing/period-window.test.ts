import assert from 'node:assert/strict'
import { addUtcMonths, currentPeriodWindow, monthlySubWindow } from '@/lib/billing/caps'

const iso = (s: string) => new Date(s)

// --- addUtcMonths: month-end anchors ----------------------------------------
// Computed from the original anchor each time, so a Jan 31 anchor does not
// decay to the 28th after February.
assert.equal(addUtcMonths(iso('2026-01-31T10:00:00Z'), 1).toISOString(), '2026-02-28T10:00:00.000Z')
assert.equal(addUtcMonths(iso('2026-01-31T10:00:00Z'), 2).toISOString(), '2026-03-31T10:00:00.000Z')
assert.equal(addUtcMonths(iso('2026-01-31T10:00:00Z'), 3).toISOString(), '2026-04-30T10:00:00.000Z')
// Leap year February keeps the 29th.
assert.equal(addUtcMonths(iso('2028-01-31T00:00:00Z'), 1).toISOString(), '2028-02-29T00:00:00.000Z')
// Crossing the year boundary.
assert.equal(addUtcMonths(iso('2026-11-15T00:00:00Z'), 2).toISOString(), '2027-01-15T00:00:00.000Z')
assert.equal(addUtcMonths(iso('2026-03-15T00:00:00Z'), 12).toISOString(), '2027-03-15T00:00:00.000Z')

// --- monthlySubWindow: the slice that contains `now` -------------------------
{
  const start = iso('2026-03-15T09:30:00Z')
  const end = iso('2027-03-15T09:30:00Z')

  // First slice, right at the anchor.
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-03-15T09:30:00Z'), end)),
    { start: '2026-03-15T09:30:00.000Z', end: '2026-04-15T09:30:00.000Z' },
    'now == period start → first slice'
  )
  // Mid-year.
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-09-25T12:00:00Z'), end)),
    { start: '2026-09-15T09:30:00.000Z', end: '2026-10-15T09:30:00.000Z' },
    'a September mark sits in the 15 Sep – 15 Oct slice'
  )
  // One millisecond before a boundary is still the previous slice; the boundary
  // itself opens the next one (half-open intervals, same as the RPC's `<`).
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-10-15T09:29:59.999Z'), end)),
    { start: '2026-09-15T09:30:00.000Z', end: '2026-10-15T09:30:00.000Z' }
  )
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-10-15T09:30:00Z'), end)),
    { start: '2026-10-15T09:30:00.000Z', end: '2026-11-15T09:30:00.000Z' }
  )
  // The last month of the year ends where Polar's period ends.
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2027-03-01T00:00:00Z'), end)),
    { start: '2027-02-15T09:30:00.000Z', end: '2027-03-15T09:30:00.000Z' },
    'twelfth slice ends at period end'
  )
  // A `now` before the anchor (clock skew, a period that starts later today)
  // still gets the first slice rather than something in the past.
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-03-14T00:00:00Z'), end)),
    { start: '2026-03-15T09:30:00.000Z', end: '2026-04-15T09:30:00.000Z' }
  )
}

// Month-end anchor: a Jan 31 yearly subscriber resets on the last day of every
// month, and the slice boundaries never drift.
{
  const start = iso('2026-01-31T00:00:00Z')
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-02-10T00:00:00Z'), null)),
    { start: '2026-01-31T00:00:00.000Z', end: '2026-02-28T00:00:00.000Z' }
  )
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-03-01T00:00:00Z'), null)),
    { start: '2026-02-28T00:00:00.000Z', end: '2026-03-31T00:00:00.000Z' }
  )
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2026-04-30T00:00:00Z'), null)),
    { start: '2026-04-30T00:00:00.000Z', end: '2026-05-31T00:00:00.000Z' }
  )
}

// Period end that lands a little short of the twelfth anchor (Polar's yearly
// period is 365 days, not 12 calendar months, in a leap year) clamps the end.
{
  const start = iso('2027-12-31T00:00:00Z')
  const end = iso('2028-12-30T00:00:00Z') // 365 days later, leap year
  assert.deepEqual(
    toIso(monthlySubWindow(start, iso('2028-12-15T00:00:00Z'), end)),
    { start: '2028-11-30T00:00:00.000Z', end: '2028-12-30T00:00:00.000Z' },
    'the slice cannot extend past the paid period'
  )
}

// --- currentPeriodWindow: the wiring the gate reads ---------------------------
// The bug: any paid tier got Polar's whole period, so yearly plans were metered
// against TIER_MONTHLY_CAPS once a year.
{
  const yearly = currentPeriodWindow({
    tier: 'scholar',
    periodStart: '2026-03-15T09:30:00Z',
    periodEnd: '2027-03-15T09:30:00Z',
    billingPeriod: 'yearly',
    now: iso('2026-09-25T12:00:00Z'),
  })
  assert.deepEqual(yearly, {
    start: '2026-09-15T09:30:00.000Z',
    end: '2026-10-15T09:30:00.000Z',
    source: 'subscription',
  })

  const monthly = currentPeriodWindow({
    tier: 'scholar',
    periodStart: '2026-09-15T09:30:00Z',
    periodEnd: '2026-10-15T09:30:00Z',
    billingPeriod: 'monthly',
    now: iso('2026-09-25T12:00:00Z'),
  })
  assert.deepEqual(monthly, {
    start: '2026-09-15T09:30:00Z',
    end: '2026-10-15T09:30:00Z',
    source: 'subscription',
  })

  // Legacy rows have no billing_period: treated as monthly, exactly as before.
  const legacy = currentPeriodWindow({
    tier: 'mastery',
    periodStart: '2026-09-01T00:00:00Z',
    periodEnd: '2026-10-01T00:00:00Z',
    billingPeriod: null,
    now: iso('2026-09-25T12:00:00Z'),
  })
  assert.equal(legacy.start, '2026-09-01T00:00:00Z')

  // Free users use the calendar month regardless.
  const free = currentPeriodWindow({ tier: 'free', now: iso('2026-09-25T12:00:00Z') })
  assert.deepEqual(free, {
    start: '2026-09-01T00:00:00.000Z',
    end: '2026-10-01T00:00:00.000Z',
    source: 'free_tier',
  })

  // A yearly row with an unparseable period start falls back to the raw values
  // rather than throwing on the gate.
  const broken = currentPeriodWindow({
    tier: 'scholar',
    periodStart: 'not-a-date',
    periodEnd: null,
    billingPeriod: 'yearly',
    now: iso('2026-09-25T12:00:00Z'),
  })
  assert.equal(broken.start, 'not-a-date')
  assert.equal(broken.source, 'subscription')
}

function toIso(w: { start: Date; end: Date }) {
  return { start: w.start.toISOString(), end: w.end.toISOString() }
}

console.log('period-window.test.ts: ok')
