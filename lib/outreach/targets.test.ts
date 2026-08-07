import assert from 'node:assert/strict'
import {
  buildFunnel,
  outreachLink,
  schoolSlug,
  utmSourceFor,
  websiteHost,
  type OutreachTarget,
} from '@/lib/outreach/targets'

// --- slugs ---------------------------------------------------------------------

assert.equal(schoolSlug('Harrow School'), 'harrow-school')
assert.equal(schoolSlug('  St Paul’s  Girls School '), 'st-paul-s-girls-school')
assert.equal(schoolSlug('Marks & Spencer Academy'), 'marks-and-spencer-academy')

// Accented and unaccented spellings of one school must not become two targets —
// that would put two cold emails in the same department's inbox.
assert.equal(
  schoolSlug('Lycée Français'),
  schoolSlug('Lycee Francais'),
  'diacritics are folded, not dropped'
)
assert.equal(schoolSlug('Lycée Français'), 'lycee-francais')

assert.ok(schoolSlug('A'.repeat(200)).length <= 48, 'slugs stay bounded')
assert.equal(schoolSlug('!!!'), '', 'a name with no usable characters yields no slug')

// --- links ------------------------------------------------------------------------

assert.equal(utmSourceFor('harrow-school'), 'school-harrow-school')

const link = outreachLink('https://markscheme.app', 'harrow-school')
const parsed = new URL(link)
assert.equal(parsed.pathname, '/for-teachers', 'outreach lands on the teacher page')
assert.equal(
  parsed.searchParams.get('utm_source'),
  'school-harrow-school',
  'the school- prefix is what routes this to the school channel in SQL'
)
assert.equal(
  parsed.searchParams.get('utm_medium'),
  'email',
  'a cold email is distinguishable from a link the school published itself'
)
assert.equal(parsed.searchParams.get('utm_campaign'), 'teacher-outreach')

const custom = new URL(
  outreachLink('https://markscheme.app', 'x', { path: '/mark', campaign: 'sept-2026' })
)
assert.equal(custom.pathname, '/mark')
assert.equal(custom.searchParams.get('utm_campaign'), 'sept-2026')

// --- website host, for the school-domain allowlist ---------------------------------

assert.equal(websiteHost('https://www.harrowschool.org.uk/'), 'harrowschool.org.uk')
assert.equal(websiteHost('harrowschool.org.uk'), 'harrowschool.org.uk', 'scheme is optional')
assert.equal(websiteHost('HTTP://Harrow.SCH.UK/maths'), 'harrow.sch.uk', 'lowercased')
assert.equal(
  websiteHost('https://sixth.harrow.sch.uk/revision?x=1'),
  'sixth.harrow.sch.uk',
  'path and query are discarded; the host is the whole allowlist entry'
)

// A bare label would allowlist every subdomain of a non-domain — refused.
assert.equal(websiteHost('localhost'), null)
assert.equal(websiteHost('not a url at all'), null)
assert.equal(websiteHost(''), null)
assert.equal(websiteHost(null), null)
assert.equal(websiteHost(undefined), null)

// --- funnel -------------------------------------------------------------------------

const now = new Date('2026-09-20T12:00:00Z')
const daysAgo = (n: number) =>
  new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

function target(over: Partial<OutreachTarget>): OutreachTarget {
  return { school: 'S', slug: 's', status: 'queued', ...over }
}

const funnel = buildFunnel(
  [
    target({ slug: 'a', status: 'queued' }),
    target({ slug: 'b', status: 'sent', sent_at: daysAgo(10) }),
    target({ slug: 'c', status: 'sent', sent_at: daysAgo(2) }),
    target({ slug: 'd', status: 'bounced', sent_at: daysAgo(12) }),
    target({ slug: 'e', status: 'replied', sent_at: daysAgo(9) }),
    target({ slug: 'f', status: 'signed_up', sent_at: daysAgo(20) }),
    target({ slug: 'g', status: 'linked', sent_at: daysAgo(30) }),
    target({ slug: 'h', status: 'declined', sent_at: daysAgo(15) }),
  ],
  now
)

assert.equal(funnel.total, 8)
assert.equal(funnel.contacted, 7, 'queued has not been contacted')
assert.equal(
  funnel.linked,
  1,
  'a school linking to us is counted on its own — it is the point of the campaign'
)

// replied + signed_up + linked = 3 of 7 contacted.
assert.ok(
  Math.abs(funnel.replyRate - 3 / 7) < 1e-9,
  'a reply still counts once the conversation has moved past it'
)

assert.deepEqual(
  funnel.needsFollowUp.map((t) => t.slug),
  ['b'],
  'only genuinely unanswered mail is chased'
)

// Each exclusion, stated on its own so the rule cannot rot silently.
for (const status of ['bounced', 'replied', 'signed_up', 'linked', 'declined'] as const) {
  const chased = buildFunnel([target({ status, sent_at: daysAgo(30) })], now).needsFollowUp
  assert.equal(chased.length, 0, `${status} must never be chased`)
}
assert.equal(
  buildFunnel([target({ status: 'sent', sent_at: daysAgo(3) })], now).needsFollowUp.length,
  0,
  'three days is not yet silence'
)
assert.equal(
  buildFunnel([target({ status: 'sent', sent_at: null })], now).needsFollowUp.length,
  0,
  'a target with no send date cannot be overdue'
)

const empty = buildFunnel([], now)
assert.equal(empty.total, 0)
assert.equal(empty.replyRate, 0, 'no division by zero before the first email goes out')

console.log('outreach/targets.test.ts — all assertions passed')
