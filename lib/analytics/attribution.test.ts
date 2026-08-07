import assert from 'node:assert/strict'
import { firstTouch } from '@/lib/analytics/attribution'

/**
 * `firstTouch` reads browser globals at call time and memoises into
 * sessionStorage, so each case installs a fresh set of stubs. There is no
 * module-level cache to reset — a new stub store is a new session.
 */
type Env = { href: string; host: string; referrer: string }

function install({ href, host, referrer }: Env) {
  const store = new Map<string, string>()
  const g = globalThis as Record<string, unknown>

  g.window = { location: { search: new URL(href).search, host } }
  g.document = { referrer }
  g.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  }
  return store
}

// --- external referrers are kept ---------------------------------------------

install({
  href: 'https://markscheme.app/ib/past-papers',
  host: 'markscheme.app',
  referrer: 'https://www.google.com/',
})
assert.equal(
  firstTouch().referrer,
  'https://www.google.com/',
  'an external referrer is the attribution'
)

// --- same-origin referrers are navigation, not attribution -------------------

install({
  href: 'https://markscheme.app/mark',
  host: 'markscheme.app',
  referrer: 'https://markscheme.app/blog/how-to-get-a-7',
})
assert.equal(
  firstTouch().referrer,
  '',
  'an internal referrer must not be recorded as a source — this was the original bug'
)

// --- UTM capture --------------------------------------------------------------

install({
  href: 'https://markscheme.app/for-teachers?utm_source=school-harrow&utm_medium=email&utm_campaign=sept-2026',
  host: 'markscheme.app',
  referrer: '',
})
let touch = firstTouch()
assert.equal(touch.utmSource, 'school-harrow', 'utm_source is captured')
assert.equal(touch.utmMedium, 'email', 'utm_medium is captured')
assert.equal(touch.utmCampaign, 'sept-2026', 'utm_campaign is captured')
assert.equal(touch.utmContent, '', 'absent params are empty, not undefined')

// --- first touch wins ---------------------------------------------------------

const store = install({
  href: 'https://markscheme.app/?utm_source=tiktok&utm_medium=social',
  host: 'markscheme.app',
  referrer: 'https://www.tiktok.com/',
})
firstTouch()

// Simulate a later pageview in the same session: the query string is gone and
// document.referrer now points at an internal route. The stored first touch must
// survive both, since the same sessionStorage stub is still installed.
const g = globalThis as Record<string, unknown>
g.window = { location: { search: '', host: 'markscheme.app' } }
g.document = { referrer: 'https://markscheme.app/' }

touch = firstTouch()
assert.equal(touch.utmSource, 'tiktok', 'first-touch utm_source survives navigation')
assert.equal(
  touch.referrer,
  'https://www.tiktok.com/',
  'first-touch referrer survives navigation'
)
assert.ok(store.get('ms_attr'), 'first touch is persisted for the session')

// --- unusable storage degrades quietly ----------------------------------------

install({
  href: 'https://markscheme.app/?utm_source=reddit',
  host: 'markscheme.app',
  referrer: '',
})
g.sessionStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}
assert.equal(
  firstTouch().utmSource,
  'reddit',
  'blocked storage still attributes the landing pageview rather than throwing'
)

// --- a malformed referrer is dropped, not guessed at --------------------------

install({
  href: 'https://markscheme.app/',
  host: 'markscheme.app',
  referrer: 'not a url',
})
assert.equal(firstTouch().referrer, '', 'an unparseable referrer yields no source')

// --- overlong values are capped ------------------------------------------------

install({
  href: `https://markscheme.app/?utm_campaign=${'x'.repeat(500)}`,
  host: 'markscheme.app',
  referrer: '',
})
assert.equal(
  firstTouch().utmCampaign.length,
  128,
  'a hostile campaign value is capped client-side as well as at the route'
)

console.log('attribution.test.ts — all assertions passed')
