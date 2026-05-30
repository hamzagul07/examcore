#!/usr/bin/env node
/**
 * Sync Cambridge past-paper PDFs from PapaCambridge → Supabase Storage (`paper-pdfs`).
 *
 * PapaCambridge serves PDFs at predictable URLs:
 *   https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/9709_s24_qp_12.pdf
 *
 * The site uses Cloudflare. Server-side fetch often gets 403 unless you pass browser cookies.
 *
 * Usage:
 *   node scripts/sync-papacambridge-papers.mjs --dry-run
 *   node scripts/sync-papacambridge-papers.mjs --subject 9709 --session s24
 *   node scripts/sync-papacambridge-papers.mjs --config scripts/papacambridge-sync.config.json
 *   node scripts/sync-papacambridge-papers.mjs --manifest scripts/my-files.txt
 *   node scripts/sync-papacambridge-papers.mjs --local-dir ./_downloads
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PAPACAMBRIDGE_COOKIE   (optional but usually required — see README below)
 *
 * Getting PAPACAMBRIDGE_COOKIE:
 *   1. Open https://pastpapers.papacambridge.com in Chrome
 *   2. DevTools → Network → open any PDF → copy Request Headers → Cookie
 *   3. Add to .env.local: PAPACAMBRIDGE_COOKIE="cf_clearance=...; ..."
 *
 * Licensing: Cambridge past papers are copyrighted. Only sync content you may use in ExamCore.
 */

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BUCKET = 'paper-pdfs'
const PAPA_BASE =
  'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload'
const DEFAULT_CONFIG = join(__dirname, 'papacambridge-sync.config.json')

const FILENAME_RE = /^(\d{4})_([smw]\d{2})_(qp|ms)_(.+)\.pdf$/i

// ---------------------------------------------------------------------------
// Env
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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    skipExisting: true,
    concurrency: 3,
    delayMs: 400,
    config: DEFAULT_CONFIG,
    subjects: [],
    sessions: [],
    kinds: ['qp', 'ms'],
    manifest: null,
    localDir: null,
    probe: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--dry-run':
        opts.dryRun = true
        break
      case '--no-skip-existing':
        opts.skipExisting = false
        break
      case '--probe':
        opts.probe = true
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
      case '--session':
        opts.sessions.push(argv[++i])
        break
      case '--kind':
        opts.kinds = [argv[++i]]
        break
      case '--manifest':
        opts.manifest = argv[++i]
        break
      case '--local-dir':
        opts.localDir = argv[++i]
        break
      case '--concurrency':
        opts.concurrency = Number(argv[++i]) || 3
        break
      case '--delay-ms':
        opts.delayMs = Number(argv[++i]) || 400
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
sync-papacambridge-papers.mjs — fetch PapaCambridge PDFs → Supabase Storage

Options:
  --dry-run              List actions without downloading/uploading
  --probe                Test one download (9709_s24_qp_12.pdf) and exit
  --config <path>        JSON config (default: scripts/papacambridge-sync.config.json)
  --subject <code>       Limit to subject (repeatable), e.g. 9709
  --session <code>       Limit to session (repeatable), e.g. s24
  --kind qp|ms           Only question papers or mark schemes
  --manifest <file>      Text file with one PDF basename per line
  --local-dir <path>     Upload PDFs from local folder (skip PapaCambridge fetch)
  --no-skip-existing     Re-upload even if object exists in Storage
  --concurrency <n>      Parallel downloads (default 3)
  --delay-ms <n>         Delay between starts (default 400)

Environment:
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required for upload)
  PAPACAMBRIDGE_COOKIE (recommended — Cloudflare bypass from your browser)
`)
}

// ---------------------------------------------------------------------------
// Filename → storage path (matches app/admin/ingest/ingest-client.tsx)
// ---------------------------------------------------------------------------

function parseFilename(name) {
  const base = basename(name).toLowerCase()
  const m = base.match(FILENAME_RE)
  if (!m) return null
  const [, subject_code, session_code, type, component] = m
  return {
    filename: base,
    subject_code,
    session_code,
    type,
    component,
    storagePath: `cambridge/${subject_code}/${session_code}/${type}_${component}.pdf`,
    sourceUrl: `${PAPA_BASE}/${base}`,
  }
}

function buildJobsFromConfig(configPath, filter) {
  const raw = JSON.parse(readFileSync(configPath, 'utf8'))
  const subjects = filter.subjects.length
    ? Object.fromEntries(
        filter.subjects
          .map((c) => [c, raw.subjects[c]])
          .filter(([, v]) => v)
      )
    : raw.subjects

  const sessions = filter.sessions.length ? filter.sessions : raw.sessions
  const kinds = filter.kinds.length ? filter.kinds : raw.kinds

  const jobs = []
  for (const [subjectCode, subject] of Object.entries(subjects)) {
    for (const session of sessions) {
      for (const component of subject.components) {
        for (const kind of kinds) {
          const filename = `${subjectCode}_${session}_${kind}_${component}.pdf`
          const parsed = parseFilename(filename)
          if (parsed) jobs.push(parsed)
        }
      }
    }
  }
  return jobs
}

function buildJobsFromManifest(manifestPath) {
  const lines = readFileSync(manifestPath, 'utf8').split('\n')
  const jobs = []
  for (const line of lines) {
    const name = line.trim()
    if (!name || name.startsWith('#')) continue
    const parsed = parseFilename(name)
    if (!parsed) {
      console.warn(`Skipping invalid manifest line: ${name}`)
      continue
    }
    jobs.push(parsed)
  }
  return jobs
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPdf(url, cookie) {
  const userAgent =
    process.env.PAPACAMBRIDGE_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  const headers = {
    'User-Agent': userAgent,
    Accept: 'application/pdf,*/*',
    Referer: 'https://pastpapers.papacambridge.com/',
  }
  if (cookie) headers.Cookie = cookie

  const res = await fetch(url, { headers, redirect: 'follow' })
  const contentType = res.headers.get('content-type') || ''

  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 120)
    throw new Error(`HTTP ${res.status} — ${snippet}`)
  }

  if (contentType.includes('text/html')) {
    throw new Error(
      'Got HTML instead of PDF (Cloudflare challenge). Set PAPACAMBRIDGE_COOKIE from your browser.'
    )
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 500) {
    throw new Error(`File too small (${buf.length} bytes) — probably not a valid PDF`)
  }
  if (buf.slice(0, 4).toString() !== '%PDF') {
    throw new Error('Response is not a PDF (missing %PDF header)')
  }
  return buf
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

async function storageExists(supabase, path) {
  const dir = dirname(path)
  const name = basename(path)
  const { data, error } = await supabase.storage.from(BUCKET).list(dir, {
    limit: 1000,
  })
  if (error) return false
  return (data || []).some((f) => f.name === name)
}

async function uploadPdf(supabase, storagePath, buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    upsert: true,
    contentType: 'application/pdf',
  })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

async function runPool(concurrency, items, worker) {
  let index = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const i = index++
      await worker(items[i], i)
    }
  })
  await Promise.all(workers)
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

  const cookie = process.env.PAPACAMBRIDGE_COOKIE || ''

  if (opts.probe) {
    const testUrl = `${PAPA_BASE}/9709_s24_qp_12.pdf`
    console.log(`Probing ${testUrl} ...`)
    try {
      const buf = await fetchPdf(testUrl, cookie)
      console.log(`OK — downloaded ${buf.length} bytes`)
      if (!cookie) {
        console.log(
          'Tip: set PAPACAMBRIDGE_COOKIE in .env.local if bulk sync fails with 403/HTML.'
        )
      }
    } catch (err) {
      console.error(`Probe failed: ${err.message}`)
      console.error(`
Cloudflare is blocking server-side requests. Fix options:
  1. Copy Cookie header from browser → PAPACAMBRIDGE_COOKIE in .env.local
  2. Download PDFs manually, then: node scripts/sync-papacambridge-papers.mjs --local-dir ./downloads
`)
      process.exit(1)
    }
    return
  }

  let jobs
  if (opts.localDir) {
    const { readdirSync } = await import('fs')
    jobs = []
    for (const name of readdirSync(opts.localDir)) {
      if (!name.toLowerCase().endsWith('.pdf')) continue
      const parsed = parseFilename(name)
      if (!parsed) {
        console.warn(`Skipping unrecognized file: ${name}`)
        continue
      }
      jobs.push({ ...parsed, localPath: join(opts.localDir, name) })
    }
  } else if (opts.manifest) {
    jobs = buildJobsFromManifest(opts.manifest)
  } else {
    if (!existsSync(opts.config)) {
      throw new Error(`Config not found: ${opts.config}`)
    }
    jobs = buildJobsFromConfig(opts.config, opts)
  }

  console.log(`Jobs: ${jobs.length}`)
  if (jobs.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const supabase = opts.dryRun ? null : createSupabase()
  const stats = { ok: 0, skip: 0, miss: 0, fail: 0 }

  await runPool(opts.concurrency, jobs, async (job, i) => {
    const label = `${job.filename} → ${job.storagePath}`
    if (i > 0) await sleep(opts.delayMs)

    try {
      if (!opts.dryRun && opts.skipExisting && supabase) {
        const exists = await storageExists(supabase, job.storagePath)
        if (exists) {
          stats.skip++
          console.log(`[skip] ${label}`)
          return
        }
      }

      if (opts.dryRun) {
        console.log(`[dry-run] ${label}`)
        if (job.localPath) console.log(`          local: ${job.localPath}`)
        else console.log(`          url:   ${job.sourceUrl}`)
        stats.ok++
        return
      }

      let buffer
      if (job.localPath) {
        buffer = readFileSync(job.localPath)
        if (buffer.slice(0, 4).toString() !== '%PDF') {
          throw new Error('Local file is not a PDF')
        }
      } else {
        try {
          buffer = await fetchPdf(job.sourceUrl, cookie)
        } catch (err) {
          if (/HTTP 404|HTTP 403|too small/i.test(err.message)) {
            stats.miss++
            console.log(`[miss] ${label} — ${err.message}`)
            return
          }
          throw err
        }
      }

      await uploadPdf(supabase, job.storagePath, buffer)
      stats.ok++
      console.log(`[ok]   ${label} (${buffer.length} bytes)`)
    } catch (err) {
      stats.fail++
      console.error(`[fail] ${label} — ${err.message}`)
    }
  })

  console.log(`
Done.
  uploaded: ${stats.ok}
  skipped (already in storage): ${stats.skip}
  not found / blocked: ${stats.miss}
  failed: ${stats.fail}
`)
  if (stats.fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
