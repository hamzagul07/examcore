#!/usr/bin/env node
/**
 * Sync Cambridge A-Level past-paper PDFs from Best Exam Help → Supabase Storage.
 *
 * Source: https://bestexamhelp.com/exam/cambridge-international-a-level/
 * No Cloudflare cookies required — direct PDF URLs return HTTP 200.
 *
 * Usage:
 *   node scripts/sync-bestexamhelp-papers.mjs --probe
 *   node scripts/sync-bestexamhelp-papers.mjs --discover
 *   node scripts/sync-bestexamhelp-papers.mjs --dry-run
 *   node scripts/sync-bestexamhelp-papers.mjs
 *   node scripts/sync-bestexamhelp-papers.mjs --subject 9709 --year 2024
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BUCKET = 'paper-pdfs'
const BEH_ROOT =
  'https://bestexamhelp.com/exam/cambridge-international-a-level'
const DEFAULT_CONFIG = join(__dirname, 'bestexamhelp-sync.config.json')

const LINK_RE = /(\d{4})-([smw]\d{2})-(qp|ms)-(\d+)\.php/gi
const SESSION_HREF_RE = /href="(\d{4})\/(march|summer|winter)\.php"/gi
const SUBJECT_HREF_RE =
  /href="([a-z0-9-]+)\/index\.php">[^<]*-\s*(\d{4})</gi

// ---------------------------------------------------------------------------
// Env + CLI
// ---------------------------------------------------------------------------

function loadEnvFile(filename) {
  const path = join(ROOT, filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    discover: false,
    probe: false,
    skipExisting: false,
    concurrency: 4,
    delayMs: 250,
    config: DEFAULT_CONFIG,
    subjects: [],
    years: [],
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--dry-run':
        opts.dryRun = true
        break
      case '--discover':
        opts.discover = true
        break
      case '--probe':
        opts.probe = true
        break
      case '--skip-existing':
        opts.skipExisting = true
        break
      case '--help':
      case '-h':
        opts.help = true
        break
      case '--config':
        opts.config = argv[++i]
        break
      case '--subject':
        opts.subjects.push(argv[++i])
        break
      case '--year':
        opts.years.push(Number(argv[++i]))
        break
      case '--concurrency':
        opts.concurrency = Number(argv[++i]) || 4
        break
      case '--delay-ms':
        opts.delayMs = Number(argv[++i]) || 250
        break
      default:
        console.error(`Unknown argument: ${arg}`)
        process.exit(1)
    }
  }
  return opts
}

function printHelp() {
  console.log(`
sync-bestexamhelp-papers.mjs — Best Exam Help → Supabase paper-pdfs

  --probe           Test one PDF download
  --discover        Crawl and print job counts (no upload)
  --dry-run         List all jobs without downloading
  --skip-existing   Skip files already in Storage (slower)
  --subject <code>  Limit to one subject, e.g. 9709 (repeatable)
  --year <yyyy>     Limit to one year, e.g. 2024 (repeatable)
  --concurrency n   Parallel uploads (default 4)
  --delay-ms n      Delay between job starts (default 250)
`)
}

function loadConfig(path) {
  if (!existsSync(path)) {
    return { minYear: 2022, maxYear: 2025, sessionPages: ['march', 'summer', 'winter'] }
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return res.text()
}

async function fetchPdf(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/pdf,*/*',
      Referer: BEH_ROOT + '/',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    throw new Error('Got HTML instead of PDF')
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500 || buf.slice(0, 4).toString() !== '%PDF') {
    throw new Error(`Invalid PDF (${buf.length} bytes)`)
  }
  return buf
}

// ---------------------------------------------------------------------------
// Crawl Best Exam Help
// ---------------------------------------------------------------------------

async function fetchSubjects() {
  const html = await fetchText(`${BEH_ROOT}/index.php`)
  const subjects = []
  SUBJECT_HREF_RE.lastIndex = 0
  let m
  while ((m = SUBJECT_HREF_RE.exec(html)) !== null) {
    const [, slug, code] = m
    if (slug === 'index') continue
    subjects.push({ slug, code })
  }
  return subjects
}

function parseSessionLinks(html, minYear, maxYear) {
  const links = []
  SESSION_HREF_RE.lastIndex = 0
  let m
  while ((m = SESSION_HREF_RE.exec(html)) !== null) {
    const year = Number(m[1])
    const sessionPage = m[2]
    if (year >= minYear && year <= maxYear) {
      links.push({ year, sessionPage })
    }
  }
  return links
}

function parsePaperLinks(html, subjectCode, year, slug) {
  const jobs = []
  const seen = new Set()
  LINK_RE.lastIndex = 0
  let m
  while ((m = LINK_RE.exec(html)) !== null) {
    const [, code, session, kind, component] = m
    if (code !== subjectCode) continue

    const filename = `${code}_${session}_${kind}_${component}.pdf`.toLowerCase()
    if (seen.has(filename)) continue
    seen.add(filename)

    jobs.push({
      filename,
      subject_code: code,
      session_code: session.toLowerCase(),
      type: kind.toLowerCase(),
      component,
      storagePath: `cambridge/${code}/${session.toLowerCase()}/${kind.toLowerCase()}_${component}.pdf`,
      sourceUrl: `${BEH_ROOT}/${slug}/${year}/${filename}`,
      subjectSlug: slug,
      year,
    })
  }
  return jobs
}

async function discoverJobs(opts, config) {
  let subjects = await fetchSubjects()
  console.log(`Found ${subjects.length} subjects on Best Exam Help`)

  if (opts.subjects.length) {
    const want = new Set(opts.subjects)
    subjects = subjects.filter((s) => want.has(s.code))
  }

  const allJobs = []
  const minYear =
    opts.years.length > 0 ? Math.min(...opts.years) : config.minYear ?? 2022
  const maxYear =
    opts.years.length > 0 ? Math.max(...opts.years) : config.maxYear ?? 2025
  const yearFilter = opts.years.length ? new Set(opts.years) : null

  for (const subject of subjects) {
    const subjectUrl = `${BEH_ROOT}/${subject.slug}/index.php`
    let subjectHtml
    try {
      subjectHtml = await fetchText(subjectUrl)
    } catch (err) {
      console.warn(`[warn] Could not load ${subject.slug}: ${err.message}`)
      continue
    }

    let sessionLinks = parseSessionLinks(subjectHtml, minYear, maxYear)
    if (yearFilter) {
      sessionLinks = sessionLinks.filter((l) => yearFilter.has(l.year))
    }

    const allowedPages = new Set(config.sessionPages || ['march', 'summer', 'winter'])
    sessionLinks = sessionLinks.filter((l) => allowedPages.has(l.sessionPage))

    console.log(
      `  ${subject.code} ${subject.slug}: ${sessionLinks.length} session pages`
    )

    for (const { year, sessionPage } of sessionLinks) {
      const sessionUrl = `${BEH_ROOT}/${subject.slug}/${year}/${sessionPage}.php`
      try {
        await sleep(opts.delayMs)
        const sessionHtml = await fetchText(sessionUrl)
        const jobs = parsePaperLinks(sessionHtml, subject.code, year, subject.slug)
        allJobs.push(...jobs)
      } catch (err) {
        console.warn(`[warn] ${sessionUrl}: ${err.message}`)
      }
    }
  }

  // Deduplicate by storagePath
  const byPath = new Map()
  for (const job of allJobs) {
    byPath.set(job.storagePath, job)
  }
  return [...byPath.values()]
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    )
  }
  return createClient(url, key)
}

async function buildExistingSet(supabase) {
  const existing = new Set()
  async function walk(prefix) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 1000,
    })
    if (error || !data) return
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) {
        await walk(path)
      } else if (entry.name.endsWith('.pdf')) {
        existing.add(path)
      }
    }
  }
  await walk('cambridge')
  return existing
}

async function uploadPdf(supabase, storagePath, buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    upsert: true,
    contentType: 'application/pdf',
  })
  if (error) throw new Error(error.message)
}

async function runPool(concurrency, items, worker) {
  let index = 0
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (index < items.length) {
        const i = index++
        await worker(items[i], i)
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    printHelp()
    return
  }

  if (opts.probe) {
    const url = `${BEH_ROOT}/mathematics-9709/2024/9709_s24_qp_12.pdf`
    console.log(`Probing ${url}`)
    const buf = await fetchPdf(url)
    console.log(`OK — ${buf.length} bytes`)
    return
  }

  const config = loadConfig(opts.config)
  console.log(
    `Crawling Best Exam Help (years ${opts.years.length ? opts.years.join(',') : `${config.minYear}-${config.maxYear}`})...`
  )

  const jobs = await discoverJobs(opts, config)
  console.log(`\nDiscovered ${jobs.length} unique PDFs (qp + ms pairs)`)

  if (opts.discover) {
    const bySubject = {}
    for (const j of jobs) {
      bySubject[j.subject_code] = (bySubject[j.subject_code] || 0) + 1
    }
    console.log('\nBy subject:')
    for (const [code, count] of Object.entries(bySubject).sort()) {
      console.log(`  ${code}: ${count}`)
    }
    return
  }

  if (jobs.length === 0) {
    console.log('Nothing to sync.')
    return
  }

  if (opts.dryRun) {
    for (const job of jobs.slice(0, 20)) {
      console.log(`[dry-run] ${job.filename} → ${job.storagePath}`)
    }
    if (jobs.length > 20) console.log(`... and ${jobs.length - 20} more`)
    return
  }

  const supabase = createSupabase()
  let existing = null
  if (opts.skipExisting) {
    console.log('Listing existing Storage objects...')
    existing = await buildExistingSet(supabase)
    console.log(`  ${existing.size} PDFs already in bucket`)
  }

  const stats = { ok: 0, skip: 0, miss: 0, fail: 0 }
  let done = 0

  await runPool(opts.concurrency, jobs, async (job, i) => {
    if (i > 0) await sleep(opts.delayMs)
    const label = `${job.filename} → ${job.storagePath}`

    try {
      if (existing?.has(job.storagePath)) {
        stats.skip++
        done++
        if (done % 50 === 0) {
          console.log(`Progress: ${done}/${jobs.length} (uploaded ${stats.ok}, skipped ${stats.skip})`)
        }
        return
      }

      let buffer
      try {
        buffer = await fetchPdf(job.sourceUrl)
      } catch (err) {
        stats.miss++
        done++
        if (/HTTP 404|Invalid PDF|HTML/.test(err.message)) {
          return
        }
        throw err
      }

      await uploadPdf(supabase, job.storagePath, buffer)
      stats.ok++
      done++
      if (stats.ok <= 10 || stats.ok % 25 === 0) {
        console.log(`[ok] ${label} (${buffer.length} bytes)`)
      } else if (done % 100 === 0) {
        console.log(`Progress: ${done}/${jobs.length} — uploaded ${stats.ok}`)
      }
    } catch (err) {
      stats.fail++
      done++
      console.error(`[fail] ${label} — ${err.message}`)
    }
  })

  console.log(`
Done.
  uploaded: ${stats.ok}
  skipped:  ${stats.skip}
  missing:  ${stats.miss}
  failed:   ${stats.fail}
  total:    ${jobs.length}
`)
  if (stats.fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
