#!/usr/bin/env node
/**
 * Prompt C Phase 2 — dry-run question paper extraction via Gemini Pro.
 *
 * Usage:
 *   pnpm extract:paper cambridge/9702/s24/qp_42.pdf
 *   pnpm extract:paper cambridge/9702/s24/qp_12.pdf --skip-diagrams
 *   pnpm extract:paper cambridge/9702/s24/qp_42.pdf --persist
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
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  return {
    pdfPath: positional[0],
    skipDiagrams: flags.has('--skip-diagrams'),
    skipLatexValidation: flags.has('--skip-latex-validation'),
    persist: flags.has('--persist'),
    withDiagramDescriptions: flags.has('--with-diagram-descriptions'),
    skipSmoke: flags.has('--skip-smoke'),
    metricsVerbose: flags.has('--metrics-verbose'),
  }
}

function buildExportPayload(result, pdfPath) {
  const leafMarkSum = result.questions
    .filter((q) => q.marks != null)
    .reduce((s, q) => s + (q.marks ?? 0), 0)

  const highConf = result.questions.filter((q) => q.extraction_confidence > 0.85).length
  const withParent = result.questions.filter((q) => q.parent_question_id != null).length

  return {
    generatedAt: new Date().toISOString(),
    sourcePdfPath: pdfPath,
    summary: {
      pageCount: result.pageCount,
      chunksProcessed: result.chunksProcessed,
      questionCount: result.questions.length,
      topLevelCount: new Set(
        result.questions.map((q) => q.question_number.replace(/\(.*$/, '').trim())
      ).size,
      leafMarkSum,
      expectedMarkSum: result.markSumValidation?.expected ?? null,
      markSumPass: result.markSumValidation?.pass ?? null,
      singleShot: result.singleShot ?? false,
      highConfidencePct: result.questions.length
        ? Math.round((highConf / result.questions.length) * 100)
        : 0,
      withParentQuestionId: withParent,
      diagramCount: result.diagrams.length,
      diagramPassMs: result.diagramPassMs,
      diagramSamples: result.diagrams.slice(0, 3).map((d) => ({
        label: d.label,
        page: d.page,
        caption: d.caption,
        ai_description: d.ai_description,
        bbox: d.bounding_box,
      })),
      manualReviewCount: result.manualReview.length,
      jobStatus: result.jobStatus,
      splitterIssues: result.splitterIssues,
      errorMessage: result.errorMessage,
    },
    meta: result.meta,
    manualReview: result.manualReview,
    questions: result.questions.map((q) => ({
      id: q.id,
      question_number: q.question_number,
      question_path: q.question_path,
      parent_question_number: q.parent_question_number,
      parent_question_id: q.parent_question_id,
      depth: q.depth,
      is_leaf: q.is_leaf,
      marks: q.marks,
      options: q.options,
      source_page_numbers: q.source_page_numbers,
      extraction_method: q.extraction_method,
      extraction_confidence: q.extraction_confidence,
      needs_manual_review: q.needs_manual_review,
      needs_re_extraction: q.needs_re_extraction,
      question_text: q.question_text,
    })),
  }
}

async function main() {
  loadEnv()
  const {
    pdfPath,
    skipDiagrams,
    skipLatexValidation,
    persist,
    withDiagramDescriptions,
    skipSmoke,
    metricsVerbose,
  } = parseArgs(process.argv.slice(2))

  if (!pdfPath) {
    console.error(
      'Usage: pnpm extract:paper <storage-path> [--skip-diagrams] [--skip-latex-validation] [--persist]'
    )
    process.exit(1)
  }

  const { isGeminiBackendConfigured } = await import('../lib/ai/gemini-config.ts')
  if (!isGeminiBackendConfigured()) {
    console.error(
      'Gemini not configured: set USE_VERTEX_AI=true + GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS, or GEMINI_API_KEY'
    )
    process.exit(1)
  }

  const { smokeTestGeminiFlash } = await import('../lib/ai/gemini-smoke.ts')
  const { parseQuestionPaper } = await import('../lib/extraction/pdf-parser.ts')
  const { persistExtractedQuestions } = await import('../lib/extraction/question-tree.ts')
  const { persistExtractedDiagrams } = await import('../lib/extraction/diagram-persist.ts')

  if (!skipSmoke) {
    console.log('Gemini Flash smoke test...')
    await smokeTestGeminiFlash()
    console.log('Flash model OK')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log(`Downloading paper-pdfs/${pdfPath}...`)
  const { data, error } = await supabase.storage.from('paper-pdfs').download(pdfPath)
  if (error || !data) throw new Error(error?.message || 'download failed')

  const pdfBytes = (await data.arrayBuffer()).slice(0)
  console.log(`Parsing ${pdfBytes.byteLength} bytes (Gemini Pro)...`)

  const result = await parseQuestionPaper({
    pdfBytes,
    sourcePdfPath: pdfPath,
    skipDiagrams,
    skipLatexValidation,
    withDiagramDescriptions,
  })

  const outDir = join(ROOT, 'scripts', 'extraction-output')
  mkdirSync(outDir, { recursive: true })
  const slug = pdfPath.replace(/[/.]/g, '_')
  const outPath = join(outDir, `${slug}.json`)

  const payload = buildExportPayload(result, pdfPath)
  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${outPath}`)
  console.log(
    `Questions: ${result.questions.length}, chunks: ${result.chunksProcessed}, diagrams: ${result.diagrams.length}, parent links: ${payload.summary.withParentQuestionId}, manual review: ${result.manualReview.length}`
  )

  if (persist) {
    const { inserted, withParentLink } = await persistExtractedQuestions(
      supabase,
      result.meta,
      result.questions,
      pdfPath
    )
    console.log(`Persisted ${inserted} question rows (${withParentLink} with parent_question_id)`)

    if (result.diagrams.length > 0) {
      const diagramResult = await persistExtractedDiagrams(
        supabase,
        result.meta,
        result.questions,
        result.diagrams,
        pdfPath,
        { withDiagramDescriptions }
      )
      console.log(
        `Persisted ${diagramResult.inserted} diagram rows (${diagramResult.skipped} skipped, ${diagramResult.uploads} uploads)`
      )
    } else {
      console.log('No diagrams to persist')
    }
  }

  if (result.markSumValidation) {
    console.log(
      `Mark sum: ${result.markSumValidation.leafSum}/${result.markSumValidation.expected ?? '?'} (${result.markSumValidation.pass ? 'PASS' : 'FAIL'})`
    )
  }
  if (result.diagramPassMs != null) {
    console.log(`Diagram pass: ${result.diagrams.length} diagrams in ${Math.round(result.diagramPassMs / 1000)}s`)
  }
  if (result.errorMessage) {
    console.log('\nJob notes:\n' + result.errorMessage)
  }

  if (metricsVerbose) {
    const metrics = getGeminiMetrics()
    const outDir = join(ROOT, 'scripts', 'extraction-output')
    const metricsPath = join(outDir, `${slug}_metrics.json`)
    writeFileSync(metricsPath, JSON.stringify(metrics, null, 2))
    console.log(`Wrote ${metrics.length} API call metrics → ${metricsPath}`)
  }

  if (result.jobStatus === 'failed') {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
