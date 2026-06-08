#!/usr/bin/env node
/**
 * Phase 3 — Vertex throughput baseline at concurrency=1.
 *
 * GATE: requires docs/stabilization/vertex-quotas.json from Hassan before running.
 *
 * Usage:
 *   npx tsx scripts/run-throughput-baseline.mjs
 *   npx tsx scripts/run-throughput-baseline.mjs --pdf=mcq   # single archetype
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const QUOTA_FILE = join(ROOT, 'docs', 'stabilization', 'vertex-quotas.json')
const OUT_MD = join(ROOT, 'docs', 'stabilization', 'throughput-baseline.md')
const OUT_JSON = join(ROOT, 'docs', 'stabilization', 'throughput-baseline-raw.json')

const BASELINE_PDFS = {
  mcq: {
    path: 'cambridge/9702/s24/qp_12.pdf',
    type: 'mcq',
    label: 'MCQ — short text, few diagrams',
  },
  structured: {
    path: 'cambridge/9702/s24/qp_42.pdf',
    type: 'structured',
    label: 'Structured — 15+ diagrams',
  },
  'long-context': {
    path: 'cambridge/9702/s24/qp_52.pdf',
    type: 'long-context',
    label: 'Paper 5 planning — long context upper bound',
  },
}

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

function parseArgs(argv) {
  let single = null
  for (const arg of argv) {
    if (arg.startsWith('--pdf=')) single = arg.slice('--pdf='.length)
  }
  return { single }
}

function loadQuotas() {
  if (!existsSync(QUOTA_FILE)) {
    console.error(`STOP: Missing ${QUOTA_FILE}`)
    console.error('Hassan must report Vertex TPM/RPM/RPD for gemini-2.5-pro (us-central1) first.')
    console.error('Copy docs/stabilization/vertex-quotas.template.json → vertex-quotas.json and fill in values.')
    process.exit(2)
  }
  return JSON.parse(readFileSync(QUOTA_FILE, 'utf8'))
}

async function measurePdf(supabase, entry) {
  const {
    resetGeminiMetrics,
    getGeminiMetrics,
    setGeminiMetricsEnabled,
    setGeminiCallTimeoutMs,
    DEFAULT_GEMINI_CALL_TIMEOUT_MS,
  } = await import('../lib/ai/gemini-text.ts')
  const { resetGeminiRetryStats } = await import('../lib/marking/gemini-retry.ts')
  const { parseQuestionPaper } = await import('../lib/extraction/pdf-parser.ts')
  const { summarizePdfBaseline } = await import('../lib/extraction/throughput-baseline.ts')

  console.log(`\n=== ${entry.type}: ${entry.path} ===`)
  console.log(entry.label)

  setGeminiCallTimeoutMs(DEFAULT_GEMINI_CALL_TIMEOUT_MS)
  setGeminiMetricsEnabled(true)
  resetGeminiMetrics()
  resetGeminiRetryStats()

  const { data, error } = await supabase.storage.from('paper-pdfs').download(entry.path)
  if (error || !data) throw new Error(error?.message ?? 'download failed')

  const pdfBytes = (await data.arrayBuffer()).slice(0)
  const startedAt = new Date().toISOString()
  const t0 = Date.now()

  const result = await parseQuestionPaper({
    pdfBytes,
    sourcePdfPath: entry.path,
    skipDiagrams: false,
    withDiagramDescriptions: false,
  })

  const completedAt = new Date().toISOString()
  const records = getGeminiMetrics()
  const summary = summarizePdfBaseline(
    entry.path,
    entry.type,
    records,
    startedAt,
    completedAt
  )

  console.log(
    `Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — Pro ${summary.proInputTokens + summary.proOutputTokens} tok, peak TPM ${summary.peakTpm}, diagrams ${result.diagrams.length}, retries ${summary.totalRetries}`
  )

  return { summary, records, result: { diagrams: result.diagrams.length, questions: result.questions.length } }
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))
  const quotas = loadQuotas()

  if (!quotas.proTpm || quotas.proTpm < 1) {
    console.error('vertex-quotas.json must include proTpm > 0')
    process.exit(2)
  }

  const { isGeminiBackendConfigured } = await import('../lib/ai/gemini-config.ts')
  if (!isGeminiBackendConfigured()) {
    console.error('Gemini/Vertex not configured')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const targets = args.single
    ? [BASELINE_PDFS[args.single] ?? { path: args.single, type: 'other', label: args.single }]
    : Object.values(BASELINE_PDFS)

  const runs = []
  for (const entry of targets) {
    runs.push(await measurePdf(supabase, entry))
  }

  const { recommendConcurrency, formatBaselineMarkdown } = await import(
    '../lib/extraction/throughput-baseline.ts'
  )

  const recommendations = runs.map((r) =>
    recommendConcurrency(r.summary.pdfType, r.summary.peakTpm, quotas.proTpm)
  )

  const generatedAt = new Date().toISOString()
  const markdown = formatBaselineMarkdown({
    summaries: runs.map((r) => r.summary),
    quotas,
    recommendations,
    generatedAt,
  })

  mkdirSync(dirname(OUT_MD), { recursive: true })
  writeFileSync(OUT_MD, markdown)
  writeFileSync(
    OUT_JSON,
    JSON.stringify({ generatedAt, quotas, runs, recommendations }, null, 2)
  )

  console.log(`\nWrote ${OUT_MD}`)
  console.log(`Wrote ${OUT_JSON}`)
  console.log('\nLowest recommended concurrency:', Math.min(...recommendations.map((r) => r.recommendedConcurrency)))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
