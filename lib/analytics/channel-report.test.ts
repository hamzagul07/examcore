import assert from 'node:assert/strict'
import { buildReport, formatReport } from '@/lib/analytics/channel-report'

type Row = Parameters<typeof buildReport>[0][number]

function session(over: Partial<Row> = {}): Row {
  return {
    channel: 'direct',
    pageviews: 1,
    converted_at: null,
    user_id: null,
    referrer_host: null,
    utm_campaign: null,
    utm_source: null,
    ...over,
  }
}

const opts = { since: '2026-07-08T00:00:00Z', days: 30 }

// --- channel rollup -----------------------------------------------------------

const report = buildReport(
  [
    session({ channel: 'organic', referrer_host: 'www.google.com', pageviews: 3 }),
    session({ channel: 'organic', referrer_host: 'www.google.com', pageviews: 1 }),
    session({
      channel: 'organic',
      referrer_host: 'www.bing.com',
      pageviews: 2,
      user_id: 'u1',
    }),
    session({ channel: 'social', referrer_host: 'www.tiktok.com', pageviews: 5 }),
    session({
      channel: 'school',
      referrer_host: 'maths.harrow.sch.uk',
      pageviews: 4,
      user_id: 'u2',
    }),
    session({ channel: 'direct', pageviews: 1 }),
  ],
  opts
)

assert.equal(report.totalSessions, 6, 'every session is counted')
assert.equal(report.totalSignups, 2, 'a session with a user_id counts as converted')

const organic = report.channels.find((c) => c.channel === 'organic')!
assert.equal(organic.sessions, 3, 'organic sessions rolled up')
assert.equal(organic.pageviews, 6, 'organic pageviews summed')
assert.equal(organic.signups, 1, 'only the session with a user counts')
assert.ok(
  Math.abs(organic.conversion - 1 / 3) < 1e-9,
  'conversion is signups per session'
)

assert.equal(
  report.channels[0].channel,
  'organic',
  'channels are ranked by session count'
)

// --- the school KPI is isolated ------------------------------------------------

assert.deepEqual(
  report.schoolReferrers.map((r) => r.host),
  ['maths.harrow.sch.uk'],
  'school domains are reported separately — this is the outreach KPI'
)

// --- search and direct are excluded from the referring-sites ledger -------------

assert.deepEqual(
  report.referrers.map((r) => r.host).sort(),
  ['maths.harrow.sch.uk', 'www.tiktok.com'],
  'google/bing are search, not backlinks, and direct has no host'
)

// --- campaigns ------------------------------------------------------------------

const campaigns = buildReport(
  [
    session({ channel: 'email', utm_campaign: 'sept-2026', utm_source: 'school-harrow' }),
    session({
      channel: 'email',
      utm_campaign: 'sept-2026',
      utm_source: 'school-harrow',
      user_id: 'u3',
    }),
    session({ channel: 'social', utm_campaign: 'tiktok-mocks', utm_source: 'tiktok' }),
    session({ channel: 'direct' }),
  ],
  opts
).campaigns

assert.equal(campaigns.length, 2, 'sessions without a campaign are not a campaign row')
assert.equal(campaigns[0].campaign, 'sept-2026', 'campaigns ranked by sessions')
assert.equal(campaigns[0].sessions, 2)
assert.equal(campaigns[0].signups, 1)

// --- empty state is honest, not a wall of zeroes ---------------------------------

const empty = formatReport(buildReport([], opts))
assert.match(empty, /No attributed sessions yet/, 'empty report says so plainly')
assert.match(empty, /backfillable/, 'and does not imply history can be recovered')

// --- thin channels are flagged rather than silently over-read --------------------

const thin = formatReport(
  buildReport([session({ channel: 'social', referrer_host: 'www.tiktok.com' })], opts)
)
assert.match(thin, /\(thin\)/, 'a 1-session channel is marked as too thin to read')

// --- no schools yet is stated as a live target, not omitted ----------------------

assert.match(
  thin,
  /SCHOOL DOMAINS — none yet/,
  'the school KPI appears even at zero, so it stays visible'
)

console.log('channel-report.test.ts — all assertions passed')
