#!/usr/bin/env node
/**
 * Prompt C Phase 3 — mark scheme extraction + linking to extracted_questions.
 *
 * Usage:
 *   pnpm extract:ms cambridge/9702/s24/ms_42.pdf
 *   pnpm extract:ms cambridge/9702/s24/ms_42.pdf --questions-from scripts/extraction-output/cambridge_9702_s24_qp_42_pdf.json
 *   pnpm extract:ms cambridge/9702/s24/ms_42.pdf --persist
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
  const positional = argv.filter((a) => !a.startsWith('--'))
  const flags = new Map()
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--questions-from') flags.set('questionsFrom', argv[i + 1])
    if (argv[i] === '--persist') flags.set('persist', true)
  }
  return {
    pdfPath: positional[0],
    questionsFrom: flags.get('questionsFrom'),
    persist: flags.has('persist'),
  }
}

function buildExportPayload(result, pdfPath, leafCount) {
  const withEcf = result.linked.filter((p) =>
    /ecf|owtte|cao|allow|do not allow/i.test(
      `${p.examiner_notes ?? ''} ${p.point_text}`
    )
  ).length

  return {
    generatedAt: new Date().toISOString(),
    sourcePdfPath: pdfPath,
    summary: {
      pageCount: result.pageCount,
      chunksProcessed: result.chunksProcessed,
      singleShot: result.singleShot,
      msEntryCount: result.entries.length,
      markPointCount: result.linked.length,
      leafQuestionCount: leafCount,
      linkedQuestionCount: new Set(result.linked.map((p) => p.question_id)).size,
      totalMarkSum: result.validation.totalMarkSum,
      expectedTotal: result.validation.expectedTotal,
      totalMarkPass: result.validation.totalMarkPass,
      coveragePass: result.validation.coveragePass,
      missingLeaves: result.validation.missingLeaves,
      perQuestionPass: result.validation.perQuestionPass,
      perQuestionMismatchCount: result.validation.perQuestionMismatches.length,
      unmatchedMsHeaders: result.validation.unmatchedMsHeaders,
      examinerNotationCount: withEcf,
      jobStatus: result.jobStatus,
      errorMessage: result.errorMessage,
    },
    meta: result.meta,
    validation: result.validation,
    markPoints: result.linked.map((p) => ({
      id: p.id,
      question_id: p.question_id,
      question_number: p.question_number,
      point_order: p.point_order,
      point_text: p.point_text,
      marks_awarded: p.marks_awarded,
      examiner_notes: p.examiner_notes,
      alternative_phrasings: p.alternative_phrasings,
      source_page_numbers: p.source_page_numbers,
      section_label: p.section_label ?? null,
    })),
  }
}

async function main() {
  loadEnv()
  const { pdfPath, questionsFrom, persist } = parseArgs(process.argv.slice(2))

  if (!pdfPath) {
    console.error(
      'Usage: pnpm extract:ms <storage-path> [--questions-from <json>] [--persist]'
    )
    process.exit(1)
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY required in .env.local')
    process.exit(1)
  }

  const {
    linkMarkScheme,
    loadQuestionsFromExport,
    defaultQuestionsExportPath,
    persistLinkedMarkPoints,
  } = await import('../lib/extraction/mark-scheme-linker.ts')

  const questionsPath =
    questionsFrom ?? join(ROOT, defaultQuestionsExportPath(pdfPath) ?? '')
  if (!existsSync(questionsPath)) {
    console.error(`Questions JSON not found: ${questionsPath}`)
    console.error('Run extract:paper first or pass --questions-from')
    process.exit(1)
  }

  const qpExport = JSON.parse(readFileSync(questionsPath, 'utf8'))
  const questions = loadQuestionsFromExport(qpExport)
  const leafCount = questions.filter((q) => q.is_leaf).length
  console.log(`Loaded ${questions.length} questions (${leafCount} leaves) from ${questionsPath}`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log(`Downloading paper-pdfs/${pdfPath}...`)
  const { data, error } = await supabase.storage.from('paper-pdfs').download(pdfPath)
  if (error || !data) throw new Error(error?.message || 'download failed')

  const pdfBytes = (await data.arrayBuffer()).slice(0)
  console.log(`Linking mark scheme (${pdfBytes.byteLength} bytes, Gemini Pro)...`)

  const result = await linkMarkScheme({
    pdfBytes,
    sourcePdfPath: pdfPath,
    questions,
  })

  const outDir = join(ROOT, 'scripts', 'extraction-output')
  mkdirSync(outDir, { recursive: true })
  const slug = pdfPath.replace(/[/.]/g, '_')
  const outPath = join(outDir, `${slug}.json`)

  const payload = buildExportPayload(result, pdfPath, leafCount)
  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${outPath}`)
  console.log(
    `Mark points: ${result.linked.length}, linked questions: ${payload.summary.linkedQuestionCount}, MS entries: ${result.entries.length}`
  )
  console.log(
    `Total marks: ${result.validation.totalMarkSum}/${result.validation.expectedTotal ?? '?'} (${result.validation.totalMarkPass ? 'PASS' : 'FAIL'})`
  )
  console.log(
    `Coverage: ${result.validation.coveragePass ? 'PASS' : 'FAIL'} — missing ${result.validation.missingLeaves.length} leaves`
  )

  if (persist) {
    const inserted = await persistLinkedMarkPoints(supabase, result.linked)
    console.log(`Persisted ${inserted} mark points`)
  }

  if (result.errorMessage) {
    console.log('\nJob notes:\n' + result.errorMessage)
  }

  if (result.jobStatus === 'failed') {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
