#!/usr/bin/env node
/**
 * Performance baseline runner — Lighthouse + scroll trace per primary page.
 *
 * Prerequisites:
 *   pnpm add -D playwright lighthouse chrome-launcher
 *   npx playwright install chromium
 *
 * Usage:
 *   node scripts/perf-baseline.mjs [--base=http://localhost:3000] [--tag=before]
 *
 * Outputs JSON to perf-baseline/<tag>/<page-slug>.json
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

const BASE = args.base || process.env.PERF_BASE_URL || 'http://localhost:3000'
const TAG = args.tag || 'run'

const PAGES = [
  { slug: 'landing', path: '/' },
  { slug: 'dashboard', path: '/dashboard', auth: true },
  { slug: 'progress', path: '/dashboard/progress', auth: true },
  { slug: 'mark', path: '/mark', auth: true },
  { slug: 'settings', path: '/account/profile', auth: true },
  { slug: 'pricing', path: '/pricing' },
]

async function loadDeps() {
  try {
    const { chromium } = await import('playwright')
    const lighthouse = (await import('lighthouse')).default
    const chromeLauncher = await import('chrome-launcher')
    return { chromium, lighthouse, chromeLauncher }
  } catch {
    console.error(
      'Missing dependencies. Run:\n  pnpm add -D playwright lighthouse chrome-launcher\n  npx playwright install chromium'
    )
    process.exit(1)
  }
}

async function runLighthouse(url, lighthouse, chromeLauncher) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  })
  try {
    const opts = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance'],
      port: chrome.port,
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 },
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 6,
      },
    }
    const result = await lighthouse(url, opts)
    const audit = result.lhr
    return {
      url,
      performanceScore: audit.categories.performance.score,
      lcp: audit.audits['largest-contentful-paint']?.numericValue,
      tbt: audit.audits['total-blocking-time']?.numericValue,
      cls: audit.audits['cumulative-layout-shift']?.numericValue,
      fcp: audit.audits['first-contentful-paint']?.numericValue,
    }
  } finally {
    await chrome.kill()
  }
}

async function runScrollTrace(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 })
  await page.waitForTimeout(2000)

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')

  const start = Date.now()
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.85
    const max = Math.min(document.body.scrollHeight, step * 8)
    for (let y = 0; y < max; y += step) {
      window.scrollTo({ top: y, behavior: 'auto' })
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  })
  const durationMs = Date.now() - start

  const metrics = await cdp.send('Performance.getMetrics')
  const longTasks = await page.evaluate(() => {
    return performance.getEntriesByType('longtask').map((e) => ({
      duration: e.duration,
      startTime: e.startTime,
    }))
  })

  return {
    scrollDurationMs: durationMs,
    metrics: metrics.metrics,
    longTaskCount: longTasks.length,
    longTaskTotalMs: longTasks.reduce((s, t) => s + t.duration, 0),
    note: 'FPS requires DevTools Performance panel; this trace captures long tasks during scripted scroll.',
  }
}

async function main() {
  const { chromium, lighthouse, chromeLauncher } = await loadDeps()
  const outDir = path.join(root, 'perf-baseline', TAG)
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
  })

  console.log(`Perf baseline → ${outDir}`)
  console.log(`Base URL: ${BASE}\n`)

  for (const { slug, path: pagePath, auth } of PAGES) {
    const url = `${BASE}${pagePath}`
    const report = { slug, url, capturedAt: new Date().toISOString(), auth: Boolean(auth) }

    if (auth) {
      report.skipped =
        'Auth-required route — sign in via storage state or run against logged-in session. Lighthouse-only skipped.'
      console.log(`⚠ ${slug}: auth required — add storageState to script for full capture`)
      try {
        report.lighthouse = await runLighthouse(url, lighthouse, chromeLauncher)
      } catch (err) {
        report.lighthouseError = String(err)
      }
    } else {
      const page = await context.newPage()
      try {
        report.scroll = await runScrollTrace(page, url)
      } catch (err) {
        report.scrollError = String(err)
      }
      await page.close()

      try {
        report.lighthouse = await runLighthouse(url, lighthouse, chromeLauncher)
      } catch (err) {
        report.lighthouseError = String(err)
      }
    }

    const outFile = path.join(outDir, `${slug}.json`)
    await writeFile(outFile, JSON.stringify(report, null, 2))
    const score = report.lighthouse?.performanceScore
    const tbt = report.lighthouse?.tbt
    console.log(
      `✓ ${slug}: perf=${score != null ? Math.round(score * 100) : '—'} TBT=${tbt != null ? Math.round(tbt) : '—'}ms → ${path.relative(root, outFile)}`
    )
  }

  await browser.close()
  console.log('\nDone. Re-run with --tag=after to compare.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
