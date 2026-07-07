#!/usr/bin/env node
/**
 * Production distribution readiness - run after deploy or manual setup.
 * Usage: BASE_URL=https://markscheme.app pnpm seo:distribution-check
 */
import { TIKTOK_COMPANION_BLOG_SLUGS } from '../lib/seo/llms-geo-qa.ts'

const base = (process.env.BASE_URL || 'https://markscheme.app').replace(/\/$/, '')
const INDEXNOW_KEY = '38b35898-27c4-429b-a43e-b28fa420ffca'

let failed = 0
let warned = 0

async function fetchText(path) {
  const url = `${base}${path}`
  const res = await fetch(url)
  const text = await res.text()
  return { res, text, url }
}

function fail(msg) {
  failed++
  console.log(`FAIL  ${msg}`)
}

function warn(msg) {
  warned++
  console.log(`WARN  ${msg}`)
}

function ok(msg) {
  console.log(`OK    ${msg}`)
}

console.log(`Distribution check: ${base}\n`)

// IndexNow key
try {
  const { res } = await fetchText(`/${INDEXNOW_KEY}.txt`)
  if (res.status === 200) ok(`IndexNow key file /${INDEXNOW_KEY}.txt`)
  else fail(`IndexNow key file status ${res.status}`)
} catch (e) {
  fail(`IndexNow key file: ${e.message}`)
}

// Homepage
try {
  const { text } = await fetchText('/')
  if (text.includes('What is MarkScheme')) ok('Homepage GEO summary')
  else fail('Homepage missing "What is MarkScheme"')
  if (text.includes('second-pass')) ok('Homepage second-pass copy')
  else fail('Homepage missing second-pass')
  if (text.includes('wikidata.org/wiki/Q140455387')) ok('Homepage Wikidata in HTML')
  else fail('Homepage missing Wikidata URL')
  if (text.includes('home-geo-intro')) ok('Homepage GEO intro component')
  else warn('Homepage missing home-geo-intro (deploy may be stale)')
  if (/msvalidate\.01/i.test(text)) ok('Bing verification meta tag')
  else warn('Bing meta missing - set BING_SITE_VERIFICATION on Vercel (see docs/BING_WEBMASTER.md)')
} catch (e) {
  fail(`Homepage: ${e.message}`)
}

// llms.txt
try {
  const { text } = await fetchText('/llms.txt')
  if (text.includes('wikidata.org/wiki/Q140455387')) ok('llms.txt Wikidata')
  else fail('llms.txt missing Wikidata')
  if (text.includes('TikTok demo transcripts')) ok('llms.txt companion section')
  else fail('llms.txt missing TikTok companion section')
} catch (e) {
  fail(`llms.txt: ${e.message}`)
}

// Money pages
for (const path of ['/mark', '/compare', '/research', '/for-teachers', '/ib/courses']) {
  try {
    const { res } = await fetchText(path)
    if (res.status === 200) ok(`${path} returns 200`)
    else fail(`${path} status ${res.status}`)
  } catch (e) {
    fail(`${path}: ${e.message}`)
  }
}

// Companion blogs
for (const slug of TIKTOK_COMPANION_BLOG_SLUGS) {
  const path = `/blog/${slug}`
  try {
    const { res, text } = await fetchText(path)
    if (res.status !== 200) {
      fail(`${path} status ${res.status}`)
      continue
    }
    if (!text.includes('Quick answer')) {
      fail(`${path} missing Quick answer`)
      continue
    }
    if (!text.includes('Transcript')) {
      warn(`${path} missing Transcript section`)
    }
    ok(`${path}`)
  } catch (e) {
    fail(`${path}: ${e.message}`)
  }
}

console.log('')
if (failed > 0) {
  console.log(`Distribution check failed (${failed} error(s), ${warned} warning(s))`)
  process.exit(1)
}
console.log(`Distribution check passed (${warned} warning(s))`)
if (warned > 0) {
  console.log('See docs/30_MINUTE_LAUNCH.md for manual follow-ups.')
}
