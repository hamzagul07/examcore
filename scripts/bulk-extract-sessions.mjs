#!/usr/bin/env node
/**
 * Phase 11a+11b — bulk extraction across Cambridge sessions (single or multi-subject).
 *
 * Usage:
 *   pnpm bulk:extract --sessions=m24,w24 --subject=9702
 *   pnpm bulk:extract --subjects=9702,9700,9701 --sessions=s24,m24 --concurrency-per-subject=4
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_CONCURRENCY = 15
const DEFAULT_CONCURRENCY = 6

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function clampConcurrency(value, fallback = DEFAULT_CONCURRENCY) {
  if (!Number.isFinite(value) || value < 1) return fallback
  return Math.min(MAX_CONCURRENCY, Math.max(1, Math.floor(value)))
}

function parseArgs(argv) {
  let sessions = ['m24', 'w24', 'm23', 's23', 'w23', 'm22', 's22', 'w22']
  let subject = '9702'
  let subjects = null
  let concurrency = DEFAULT_CONCURRENCY
  let concurrencyPerSubject = null
  let globalCostCap = 150
  let perSessionCostCap = 15
  let perPdfCostCap = 1.5
  let perPdfTimeoutSec = 600
  let callTimeoutMs = 120_000
  let progressLog = join(ROOT, 'tmp', 'bulk-extraction-progress.log')
  let pidFile = join(ROOT, 'tmp', 'bulk-extraction.pid')
  let stateFile = join(ROOT, 'tmp', 'bulk-extraction-state.json')
  let withDiagramDescriptions = false

  for (const arg of argv) {
    if (arg.startsWith('--sessions=')) {
      sessions = arg
        .slice('--sessions='.length)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    } else if (arg.startsWith('--subjects=')) {
      subjects = arg
        .slice('--subjects='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (subjects.length === 1) subject = subjects[0]
    } else if (arg.startsWith('--subject=')) subject = arg.slice('--subject='.length)
    else if (arg.startsWith('--concurrency-per-subject=')) {
      concurrencyPerSubject = clampConcurrency(
        Number(arg.slice('--concurrency-per-subject='.length))
      )
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = clampConcurrency(Number(arg.slice('--concurrency='.length)))
    } else if (arg.startsWith('--global-cost-cap=')) {
      globalCostCap = Number(arg.slice('--global-cost-cap='.length))
    } else if (arg.startsWith('--per-session-cost-cap=')) {
      perSessionCostCap = Number(arg.slice('--per-session-cost-cap='.length))
    } else if (arg.startsWith('--per-pdf-cost-cap=')) {
      perPdfCostCap = Number(arg.slice('--per-pdf-cost-cap='.length))
    } else if (arg.startsWith('--progress-log=')) {
      progressLog = arg.slice('--progress-log='.length)
    } else if (arg.startsWith('--pid-file=')) {
      pidFile = arg.slice('--pid-file='.length)
    } else if (arg.startsWith('--per-pdf-timeout=')) {
      perPdfTimeoutSec = Number(arg.slice('--per-pdf-timeout='.length))
    } else if (arg.startsWith('--call-timeout-ms=')) {
      callTimeoutMs = Number(arg.slice('--call-timeout-ms='.length))
    } else if (arg.startsWith('--state-file=')) {
      stateFile = arg.slice('--state-file='.length)
    } else if (arg === '--with-diagram-descriptions') {
      withDiagramDescriptions = true
    }
  }

  concurrency = clampConcurrency(concurrency)
  if (concurrencyPerSubject == null) {
    concurrencyPerSubject = concurrency
  } else {
    concurrencyPerSubject = clampConcurrency(concurrencyPerSubject, concurrency)
  }

  const resolvedSubjects = subjects?.length ? subjects : [subject]

  return {
    sessions,
    subject,
    subjects: resolvedSubjects,
    concurrency,
    concurrencyPerSubject,
    globalCostCap,
    perSessionCostCap,
    perPdfCostCap,
    perPdfTimeoutSec,
    callTimeoutMs,
    progressLog,
    pidFile,
    stateFile,
    withDiagramDescriptions,
  }
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))

  const useVertex = ['true', '1', 'yes'].includes(
    (process.env.USE_VERTEX_AI ?? '').trim().toLowerCase()
  )
  if (useVertex) {
    if (!process.env.GOOGLE_CLOUD_PROJECT?.trim()) {
      console.error('GOOGLE_CLOUD_PROJECT required when USE_VERTEX_AI=true')
      process.exit(1)
    }
  } else if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required in .env.local (or set USE_VERTEX_AI=true)')
    process.exit(1)
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars required')
    process.exit(1)
  }

  mkdirSync(dirname(args.progressLog), { recursive: true })
  writeFileSync(args.pidFile, String(process.pid))
  console.log(`Bulk extract PID ${process.pid} → ${args.pidFile}`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { runBulkExtract } = await import('../lib/extraction/bulk-extract.ts')

  const result = await runBulkExtract(supabase, {
    rootDir: ROOT,
    subjectCode: args.subject,
    subjects: args.subjects.length > 1 ? args.subjects : undefined,
    sessions: args.sessions,
    concurrency: args.concurrency,
    concurrencyPerSubject: args.concurrencyPerSubject,
    globalCostCap: args.globalCostCap,
    perSessionCostCap: args.perSessionCostCap,
    perPdfCostCap: args.perPdfCostCap,
    perPdfTimeoutMs: args.perPdfTimeoutSec * 1000,
    callTimeoutMs: args.callTimeoutMs,
    progressLogPath: args.progressLog,
    stateFilePath: args.stateFile,
    withDiagramDescriptions: args.withDiagramDescriptions,
  })

  console.log('\nBulk extraction finished.')
  console.log(`Sessions processed: ${result.sessions.length}`)
  console.log(`Global cost (est.): $${result.globalCostUsd.toFixed(2)}`)
  console.log(`Hard stop: ${result.hardStop ? result.hardStopReason : 'no'}`)
  console.log(`Final report: docs/bulk-extraction/overnight-final-report.md`)

  if (result.hardStop) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
