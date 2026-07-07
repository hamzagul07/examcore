#!/usr/bin/env node
/**
 * Crawl sitemap URLs and report technical SEO issues in raw HTML.
 *
 * Usage:
 *   BASE_URL=http://localhost:3098 node scripts/seo-sitemap-scan.mjs
 *   BASE_URL=https://markscheme.app node scripts/seo-sitemap-scan.mjs
 *   BASE_URL=... node scripts/seo-sitemap-scan.mjs --limit=400
 */
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const concurrency = Number(process.env.SEO_SCAN_CONCURRENCY || 12)

async function fetchSitemapPaths() {
  const xml = await fetch(`${base}/sitemap.xml`).then((r) => r.text())
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const url = new URL(m[1])
    return url.pathname + url.search
  })
}

async function fetchRobotsDisallows() {
  const txt = await fetch(`${base}/robots.txt`).then((r) => r.text())
  return [...txt.matchAll(/^Disallow:\s*(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter(Boolean)
}

function blocked(path, disallows) {
  return disallows.some((d) => path.startsWith(d))
}

function auditHtml(html) {
  const h1 = (html.match(/<h1[\s>]/gi) || []).length
  return {
    refresh: /http-equiv=["']refresh["']/i.test(html),
    noDesc: !/<meta[^>]+name=["']description["']/i.test(html),
    h1,
    noH1: h1 === 0,
    multiH1: h1 > 1,
    size: Buffer.byteLength(html),
    large: Buffer.byteLength(html) > 500_000,
  }
}

async function mapPool(items, fn) {
  const results = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

const disallows = await fetchRobotsDisallows()
let paths = await fetchSitemapPaths()
if (Number.isFinite(limit)) paths = paths.slice(0, limit)

console.log(`SEO sitemap scan — ${base}`)
console.log(`URLs: ${paths.length}${Number.isFinite(limit) ? ` (limit ${limit})` : ''}`)

const issues = {
  robots: [],
  refresh: [],
  noDesc: [],
  noH1: [],
  multiH1: [],
  large: [],
  fail: [],
}

await mapPool(paths, async (path) => {
  if (blocked(path, disallows)) {
    issues.robots.push(path)
    return
  }
  try {
    const res = await fetch(`${base}${path}`)
    const html = await res.text()
    if (!res.ok) {
      issues.fail.push({ path, status: res.status })
      return
    }
    const a = auditHtml(html)
    if (a.refresh) issues.refresh.push(path)
    if (a.noDesc) issues.noDesc.push(path)
    if (a.noH1) issues.noH1.push(path)
    if (a.multiH1) issues.multiH1.push(path)
    if (a.large) issues.large.push({ path, size: a.size })
  } catch (err) {
    issues.fail.push({ path, err: err.message })
  }
})

const summary = Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length]))
console.log('\nSummary:', summary)

for (const [key, list] of Object.entries(issues)) {
  if (!list.length) continue
  console.log(`\n=== ${key} (${list.length}) ===`)
  list.slice(0, 20).forEach((item) => {
    console.log(typeof item === 'object' ? JSON.stringify(item) : item)
  })
  if (list.length > 20) console.log(`… and ${list.length - 20} more`)
}

const failed = Object.entries(summary).some(([k, n]) => k !== 'robots' && n > 0)
process.exit(failed ? 1 : 0)
