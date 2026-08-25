#!/usr/bin/env node
/**
 * Prerender guard — the routes that carry acquisition traffic must stay static.
 *
 * This bug class has bitten three times: a single `useSearchParams()` at render
 * (hub pages, twice) or one server-side `headers()`/`searchParams` read (the
 * lesson library) silently flips a generateStaticParams route to per-request
 * rendering. Nothing fails — pages still serve — but every request misses the
 * CDN and TTFB roughly triples. seo-ssr-check can't catch it (the HTML is
 * identical either way); the prerender manifest is where the truth lives.
 *
 * Runs against .next after `next build`. Exact paths catch a keystone page
 * going dynamic; pattern floors catch a whole family quietly shrinking.
 * Usage: node scripts/check-prerender.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const manifestPath = path.join(process.cwd(), '.next', 'prerender-manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error(`✗ ${manifestPath} not found — run \`next build\` first`)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const routes = Object.keys(manifest.routes ?? {})
const routeSet = new Set(routes)

/** Keystone pages: each stands for a rendering-mode fix that must not regress. */
const EXACT = [
  '/', // landing (finding 51)
  // NOT /pricing: it is force-dynamic by design (signed-in tier, region currency).
  '/courses', // hub h1 fix — useSearchParams bail
  '/subjects',
  '/courses/9709/1-2-functions', // flat lesson — GuestSignupGate + route split
  '/past-papers/9700/cells-as-the-basic-units-of-living-organisms', // topic page — GuestSignupGate
]

/** Family floors: fail if a whole surface quietly stops prerendering. */
// Floors ≈ 75% of the counts CI measured on the first guarded build
// (798 / 716 / 4803 / 871) — content grows, rarely shrinks; a dip below
// these means a real regression, not authoring churn.
const FLOORS = [
  { label: 'CAIE flat lessons  /courses/{code}/{slug}', re: /^\/courses\/[^/]+\/[^/]+$/, min: 600 },
  { label: 'past-paper topics  /past-papers/{code}/{topic}', re: /^\/past-papers\/[^/]+\/[^/]+$/, min: 500 },
  { label: 'IB lessons         /ib/courses/{slug}/…', re: /^\/ib\/courses\/[^/]+\/.+$/, min: 3500 },
  { label: 'IB paper topics    /ib/past-papers/{slug}/{topic}', re: /^\/ib\/past-papers\/[^/]+\/[^/]+$/, min: 600 },
]

let failed = false

for (const p of EXACT) {
  if (routeSet.has(p)) {
    console.log(`✓ static  ${p}`)
  } else {
    failed = true
    console.error(`✗ NOT prerendered: ${p}`)
  }
}

for (const { label, re, min } of FLOORS) {
  const count = routes.reduce((n, r) => (re.test(r) ? n + 1 : n), 0)
  if (count >= min) {
    console.log(`✓ ${String(count).padStart(5)} ≥ ${min}  ${label}`)
  } else {
    failed = true
    console.error(`✗ only ${count} prerendered (floor ${min}): ${label}`)
  }
}

if (failed) {
  console.error(`
A guarded route stopped prerendering. The usual culprits, in order:
  1. useSearchParams() at render in a client component with no Suspense
     boundary (read window.location.search in an effect instead);
  2. a server component awaiting \`searchParams\`, or calling headers()/
     cookies()/auth per request (move the decision client-side, or split the
     route as courses/[code]/[lessonSlug] vs [...slug] did);
  3. a fetch/unstable_cache change that opts the route into dynamic rendering.
Compare the route table in the build output against main to find the flip.`)
  process.exit(1)
}
console.log(`\nAll guarded routes prerendered (${routes.length} total static routes).`)
