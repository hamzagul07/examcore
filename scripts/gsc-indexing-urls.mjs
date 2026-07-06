#!/usr/bin/env node
/**
 * Print GSC URL Inspection batches for results-week re-indexing.
 *
 *   node scripts/gsc-indexing-urls.mjs           # all tiers
 *   node scripts/gsc-indexing-urls.mjs --tier 1  # Tier 1 only (~7 URLs)
 *   node scripts/gsc-indexing-urls.mjs --tier 2  # A-Level boundary guides
 *   node scripts/gsc-indexing-urls.mjs --tier courses-9706  # Paper 3/4 lesson URLs
 *   node scripts/gsc-indexing-urls.mjs --day 1   # first 15 URLs across tiers
 *
 * Paste each URL into GSC ? URL Inspection ? Request indexing (~10ÿ15/day).
 */
const BASE = 'https://markscheme.app'

const TIERS = {
  1: [
    '/',
    '/guides/grade-boundaries',
    '/blog/cambridge-post-exam-results-prep-2026',
    '/blog/cambridge-may-june-2026-grade-thresholds-what-to-expect',
    '/blog/cambridge-results-day-august-2026-guide',
    '/tools/grade-boundary-calculator',
    '/insights',
  ],
  2: [
    '9709-mathematics',
    '9700-biology',
    '9701-chemistry',
    '9702-physics',
    '9708-economics',
    '9609-business',
    '9990-psychology',
    '9489-history',
    '9696-geography',
    '9699-sociology',
    '9706-accounting',
    '9084-law',
    '9618-computer-science',
    '9607-media-studies',
    '9231-further-mathematics',
    '9488-islamic-studies',
    '9695-literature-in-english',
  ].map((s) => `/blog/cambridge-${s}-grade-boundaries-2026`),
  3: [
    '4024-mathematics',
    '0580-mathematics',
    '0990-first-language-english',
    '0610-biology',
    '0620-chemistry',
    '0625-physics',
    '2281-economics',
    '7115-business-studies',
    '4037-additional-mathematics',
    '2210-computer-science',
    '5090-biology',
    '5070-chemistry',
    '5054-physics',
    '7707-accounting',
    '0460-geography',
  ].flatMap((s) => [
    `/blog/cambridge-${s}-grade-boundaries-2026`,
    `/tools/grade-boundary-calculator/${s.split('-')[0]}`,
  ]),
  4: [
    'science',
    'economics',
    'history',
    'maths',
    'english',
    'business',
    'psychology',
    'sociology',
    'geography',
    'accounting',
    'law',
    'media-studies',
    'islamic-studies',
    'computer-science',
  ].map((s) => `/blog/most-repeated-cambridge-${s}-past-paper-topics-2026`),
  ib: [
    '/ib',
    '/blog/ib-post-exam-results-prep-2026',
    '/blog/ib-how-to-build-a-grade-7-buffer-2026',
    '/tools/ib-points-calculator',
  ],
  'courses-9706': [
    '/courses/9706',
    '/courses/9706/3-1-1-financial-statements',
    '/courses/9706/3-1-2-partnerships',
    '/courses/9706/3-1-3-clubs-and-societies',
    '/courses/9706/3-1-4-manufacturing-businesses',
    '/courses/9706/3-1-5-limited-companies',
    '/courses/9706/3-2-1-international-accounting-standards',
    '/courses/9706/3-2-2-ethical-considerations',
    '/courses/9706/3-2-3-auditing-and-stewardship-of-limited-companies',
    '/courses/9706/3-3-1-business-acquisition-and-merger',
    '/courses/9706/3-4-1-computerised-accounting-systems',
    '/courses/9706/3-5-1-analysis-and-communication-of-accounting-information',
    '/courses/9706/4-1-1-activity-based-costing',
    '/courses/9706/4-2-1-standard-costing',
    '/courses/9706/4-3-1-budgeting-and-budgetary-control',
    '/courses/9706/4-4-1-investment-appraisal',
  ],
}

function getArg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (hit) return hit.slice(name.length + 3)
  const idx = process.argv.indexOf(`--${name}`)
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1]
  }
  return null
}

const tierArg = getArg('tier')
const dayArg = getArg('day')
const perDay = 15

let urls = []
if (tierArg) {
  const key = tierArg in TIERS ? tierArg : Number(tierArg)
  urls = (TIERS[key] ?? []).map((p) => `${BASE}${p}`)
} else {
  for (const paths of Object.values(TIERS)) {
    urls.push(...paths.map((p) => `${BASE}${p}`))
  }
}

urls = [...new Set(urls)]

if (dayArg) {
  const day = Math.max(1, parseInt(dayArg, 10) || 1)
  const start = (day - 1) * perDay
  const batch = urls.slice(start, start + perDay)
  console.log(`# Day ${day} - ${batch.length} URLs (${start + 1}-${start + batch.length} of ${urls.length})\n`)
  for (const u of batch) console.log(u)
} else if (tierArg) {
  console.log(`# Tier ${tierArg} - ${urls.length} URLs\n`)
  for (const u of urls) console.log(u)
} else {
  for (const [tier, paths] of Object.entries(TIERS)) {
    console.log(`\n# Tier ${tier} (${paths.length} URLs)`)
    for (const p of paths) console.log(`${BASE}${p}`)
  }
  console.log(`\n# Total unique: ${urls.length}`)
  console.log(`# Batches: ${Math.ceil(urls.length / perDay)} days at ${perDay}/day`)
}
