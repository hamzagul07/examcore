#!/usr/bin/env node
/**
 * Backfill extracted_diagrams for completed QP jobs that reported diagrams_extracted
 * but have no DB rows (historical runs before persist was wired / bucket existed).
 *
 * Storage investigation: if extracted-diagrams bucket has files, this script could link
 * them — currently runs diagram-only re-extraction from paper-pdfs when storage is empty.
 *
 * Usage:
 *   node scripts/backfill-missing-diagrams.mjs --subject=9702
 *   node scripts/backfill-missing-diagrams.mjs --pdf=cambridge/9702/s24/qp_42.pdf
 *   node scripts/backfill-missing-diagrams.mjs --subject=9702 --dry-run
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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
  let subject = '9702'
  let pdf = null
  let dryRun = false
  let limit = null

  for (const arg of argv) {
    if (arg.startsWith('--subject=')) subject = arg.slice('--subject='.length)
    else if (arg.startsWith('--pdf=')) pdf = arg.slice('--pdf='.length)
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length))
    else if (arg === '--dry-run') dryRun = true
  }

  return { subject, pdf, dryRun, limit }
}

async function listStorageFiles(supabase) {
  const { data, error } = await supabase.storage.from('extracted-diagrams').list('cambridge', {
    limit: 5,
  })
  return { count: data?.length ?? 0, error: error?.message ?? null, sample: data?.slice(0, 3) ?? [] }
}

async function listCandidateJobs(supabase, subject, pdf) {
  let query = supabase
    .from('extraction_jobs')
    .select('source_pdf_path, diagrams_extracted, status, metadata')
    .eq('pdf_type', 'question-paper')
    .eq('status', 'completed')
    .gt('diagrams_extracted', 0)
    .like('source_pdf_path', `cambridge/${subject}/%`)

  if (pdf) query = query.eq('source_pdf_path', pdf)

  const { data, error } = await query.order('source_pdf_path')
  if (error) throw new Error(error.message)
  return data ?? []
}

async function main() {
  loadEnv()
  const args = parseArgs(process.argv.slice(2))

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars required')
    process.exit(1)
  }

  const { setGeminiCallTimeoutMs, DEFAULT_GEMINI_CALL_TIMEOUT_MS } = await import(
    '../lib/ai/gemini-text.ts'
  )
  setGeminiCallTimeoutMs(DEFAULT_GEMINI_CALL_TIMEOUT_MS)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const storage = await listStorageFiles(supabase)
  console.log('Storage probe extracted-diagrams/cambridge:', storage)

  let targets = await listCandidateJobs(supabase, args.subject, args.pdf)

  if (args.pdf && targets.length === 0) {
    const { count } = await supabase
      .from('extracted_questions')
      .select('id', { count: 'exact', head: true })
      .eq('source_pdf_path', args.pdf)
    if ((count ?? 0) > 0) {
      targets = [{ source_pdf_path: args.pdf, diagrams_extracted: null }]
      console.log(`No extraction_jobs row for ${args.pdf}; using extracted_questions (${count} rows)`)
    }
  }

  const capped = args.limit ? targets.slice(0, args.limit) : targets
  console.log(`Candidate PDFs: ${capped.length} (of ${targets.length})`)

  if (args.dryRun) {
    for (const j of capped) {
      console.log(`  ${j.source_pdf_path} diagrams_extracted=${j.diagrams_extracted ?? 'n/a'}`)
    }
    return
  }

  const { backfillDiagramsForPdf } = await import('../lib/extraction/diagram-backfill.ts')

  const results = []
  let insertedTotal = 0
  let skippedPdfs = 0

  for (const job of capped) {
    const path = job.source_pdf_path
    const expected = job.diagrams_extracted != null ? `~${job.diagrams_extracted}` : 'unknown'
    console.log(`\n--- ${path} (expected ${expected} diagrams) ---`)
    const { data: file, error: dlErr } = await supabase.storage.from('paper-pdfs').download(path)
    if (dlErr || !file) {
      console.error(`  download failed: ${dlErr?.message}`)
      results.push({ path, error: dlErr?.message ?? 'download failed' })
      continue
    }

    const pdfBytes = (await file.arrayBuffer()).slice(0)
    try {
      const result = await backfillDiagramsForPdf(supabase, path, pdfBytes)
      console.log(
        `  detected=${result.diagramsDetected} inserted=${result.persist.inserted} skipped=${result.persist.skipped} reason=${result.skippedReason ?? 'ok'}`
      )
      insertedTotal += result.persist.inserted
      if (result.skippedReason) skippedPdfs++
      results.push(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  error: ${msg}`)
      results.push({ path, error: msg })
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    subject: args.subject,
    storageProbe: storage,
    jobsProcessed: capped.length,
    insertedTotal,
    skippedPdfs,
    results,
  }

  const outDir = join(ROOT, 'docs', 'stabilization')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'diagram-backfill-results.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(`\nWrote ${outPath}`)
  console.log(`Total diagram rows inserted: ${insertedTotal}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
