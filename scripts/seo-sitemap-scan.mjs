#!/usr/bin/env node
/**
 * Crawl sitemap URLs and report technical SEO issues in raw HTML.
 *
 * Usage:
 *   BASE_URL=http://localhost:3098 node scripts/seo-sitemap-scan.mjs
 *   BASE_URL=https://markscheme.app node scripts/seo-sitemap-scan.mjs
 *   BASE_URL=... node scripts/seo-sitemap-scan.mjs --limit=400
 *   SEO_SCAN_SKIP_PREFIXES=/community/,/dashboard/ BASE_URL=... node scripts/seo-sitemap-scan.mjs
 */
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const concurrency = Number(process.env.SEO_SCAN_CONCURRENCY || 12)
const skipPrefixes = (process.env.SEO_SCAN_SKIP_PREFIXES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)

function shouldSkipPath(path) {
  return skipPrefixes.some((prefix) => path.startsWith(prefix))
}

function locsFromXml(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
}

function pathFromLoc(loc) {
  const url = new URL(loc)
  return url.pathname + url.search
}

/** True for sitemap index / shard documents — not HTML pages to audit. */
function isSitemapDocPath(path) {
  return (
    path === '/sitemap.xml' ||
    path === '/sitemap-index.xml' ||
    path.startsWith('/sitemap/')
  )
}

/**
 * Expand sitemap index → shard urlsets → page paths.
 * `/sitemap.xml` is an index of `/sitemap/{id}.xml` shards (not a urlset).
 */
async function fetchSitemapPaths() {
  const rootXml = await fetch(`${base}/sitemap.xml`).then((r) => r.text())
  const rootLocs = locsFromXml(rootXml)
  const shardLocs = rootLocs.filter((loc) => {
    try {
      return isSitemapDocPath(pathFromLoc(loc))
    } catch {
      return false
    }
  })
  const directPages = rootLocs
    .filter((loc) => {
      try {
        return !isSitemapDocPath(pathFromLoc(loc))
      } catch {
        return false
      }
    })
    .map(pathFromLoc)

  if (!shardLocs.length) return directPages

  const pagePaths = [...directPages]
  for (const shardLoc of shardLocs) {
    const shardXml = await fetch(shardLoc).then((r) => r.text())
    for (const loc of locsFromXml(shardXml)) {
      try {
        const path = pathFromLoc(loc)
        if (!isSitemapDocPath(path)) pagePaths.push(path)
      } catch {
        // skip malformed loc
      }
    }
  }
  return [...new Set(pagePaths)]
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
const skipped = paths.filter(shouldSkipPath).length
paths = paths.filter((path) => !shouldSkipPath(path))

console.log(`SEO sitemap scan - ${base}`)
console.log(`URLs: ${paths.length}${skipped ? ` (${skipped} skipped)` : ''}${Number.isFinite(limit) ? ` (limit ${limit})` : ''}`)

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
    let res
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(`${base}${path}`)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        if (attempt < 2) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
      }
    }
    if (lastErr) throw lastErr
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
  if (list.length > 20) console.log(`... and ${list.length - 20} more`)
}

// Soft signals (noDesc / noH1 / large) are reported for triage but do not fail
// CI — a full shard crawl always surfaces a few heavy lessons. Hard fail on
// broken URLs, meta-refresh, or multi-H1 (crawl / ranking hazards).
const hardFail =
  summary.fail > 0 || summary.refresh > 0 || summary.multiH1 > 0
process.exit(hardFail ? 1 : 0)
