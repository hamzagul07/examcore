import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resetGeminiRetryStats,
  getGeminiRetryStats,
  isGeminiQuotaExhausted,
  parseQuotaRetryDelayMs,
} from '@/lib/marking/gemini-retry'
import {
  QuotaExhaustedError,
  waitIfQuotaBlocked,
  writeQuotaState,
  type BulkQuotaState,
} from '@/lib/extraction/quota-state'
import { parseQuestionPaper } from './pdf-parser'
import { linkMarkScheme, loadQuestionsFromExport, persistLinkedMarkPoints } from './mark-scheme-linker'
import { persistExtractedQuestions } from './question-tree'
import {
  ensureExtractionJob,
  getExtractionJob,
  markJobCompleted,
  markJobFailed,
  markJobRunning,
  resetStaleRunningJobs,
  shouldSkipJob,
} from './extraction-jobs'
import {
  BulkCostTracker,
  estimatePdfCostUsd,
  estimateTaggingCostUsd,
} from './bulk-cost'
import {
  runTopicTagging,
  auditTagSample,
  refineValidatedTags,
  getSyllabusObjectives,
} from './topic-tagger'
import {
  DEFAULT_GEMINI_CALL_TIMEOUT_MS,
  setGeminiCallTimeoutMs,
} from '@/lib/ai/gemini-text'
import { getLessonEvidence } from '@/lib/courses/content-source'
import { AdaptiveConcurrency } from './adaptive-concurrency'
import { persistExtractedDiagrams } from './diagram-persist'
import type { ExtractionPdfType } from './types'

export type BulkExtractOptions = {
  rootDir: string
  subjectCode: string
  /** When set, runs one worker per subject in parallel. */
  subjects?: string[]
  sessions: string[]
  concurrency: number
  /** Per-subject pool size when `subjects` has multiple entries. */
  concurrencyPerSubject?: number
  globalCostCap: number
  perSessionCostCap: number
  perPdfCostCap: number
  /** Max wall-clock per PDF in ms (default 10 min). */
  perPdfTimeoutMs?: number
  /** Per Gemini/Vertex HTTP call timeout in ms (default 2 min). */
  callTimeoutMs?: number
  progressLogPath: string
  /** Persists quota_exhausted_at for resume gating (default tmp/bulk-extraction-state.json). */
  stateFilePath?: string
  /** Opt in to Gemini Pro diagram alt-text (default false). */
  withDiagramDescriptions?: boolean
  dryRun?: boolean
}

export type MultiSubjectBulkResult = BulkExtractResult & {
  perSubject: Array<{
    subjectCode: string
    status: 'completed' | 'partial' | 'failed'
    globalCostUsd: number
    sessions: SessionReport[]
  }>
}

const DEFAULT_PER_PDF_TIMEOUT_MS = 600_000
const HEARTBEAT_INTERVAL_MS = 60_000
const MEMORY_LOG_EVERY_N_PDFS = 10

let pdfsProcessedThisRun = 0

function formatMemoryLine(): string {
  const mem = process.memoryUsage()
  return `rss=${Math.round(mem.rss / 1024 / 1024)}MB heap=${Math.round(mem.heapUsed / 1024 / 1024)}MB`
}

function notePdfProcessed(logPath: string): void {
  pdfsProcessedThisRun += 1
  if (pdfsProcessedThisRun % MEMORY_LOG_EVERY_N_PDFS === 0) {
    logProgress(
      logPath,
      `MEMORY pdfs=${pdfsProcessedThisRun} ${formatMemoryLine()}`
    )
  }
}

async function withPdfTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export type PdfResult = {
  path: string
  type: ExtractionPdfType
  status: 'completed' | 'failed' | 'skipped'
  skipReason?: string
  costUsd: number
  error?: string
  questions?: number
  markPoints?: number
  markSumPass?: boolean
  expectedMarks?: number | null
  actualMarks?: number | null
  diagrams?: number
  diagramsMissingAi?: number
}

export type SessionReport = {
  sessionCode: string
  status: 'completed' | 'partial' | 'failed' | 'skipped'
  startedAt: string
  endedAt: string
  costUsd: number
  qpResults: PdfResult[]
  msResults: PdfResult[]
  tagging?: {
    questionsTagged: number
    totalTags: number
    lowConfidenceTags: number
    auditPrimaryAccuracy: number | null
    auditSampleSize: number
  }
  failedPdfs: Array<{ path: string; error: string }>
}

export type BulkExtractResult = {
  startedAt: string
  endedAt: string
  hardStop: boolean
  hardStopReason: string | null
  globalCostUsd: number
  sessions: SessionReport[]
}

const MAX_PDF_RETRIES = 3
const MAX_DB_FAILURES = 3
const MAX_GEMINI_5XX_STREAK = 3
/** Minimum successful PDF extractions before a session can be marked completed. */
const MIN_SUCCESSFUL_PDFS_PER_SESSION = 8

function assertNotQuotaExhausted(err: unknown): void {
  if (!isGeminiQuotaExhausted(err)) return
  const delayMs = parseQuotaRetryDelayMs(err)
  throw new QuotaExhaustedError(
    err instanceof Error ? err.message : String(err),
    delayMs
  )
}

function recordQuotaExhausted(
  statePath: string,
  err: unknown,
  logPath: string
): QuotaExhaustedError {
  const delayMs = parseQuotaRetryDelayMs(err)
  const qe = new QuotaExhaustedError(
    err instanceof Error ? err.message : String(err),
    delayMs
  )
  const state: BulkQuotaState = {
    quota_exhausted_at: new Date().toISOString(),
    retry_after: qe.retryAfter,
    retry_delay_ms: delayMs,
    message: qe.message.slice(0, 500),
  }
  writeQuotaState(statePath, state)
  logProgress(logPath, `QUOTA EXHAUSTED — pausing until ${state.retry_after}`)
  return qe
}

function finalizeSessionStatus(
  report: SessionReport,
  qpPaths: string[],
  msPaths: string[]
): void {
  const qpSuccess = report.qpResults.filter((r) => r.status === 'completed').length
  const msSuccess = report.msResults.filter((r) => r.status === 'completed').length
  const totalSuccess = qpSuccess + msSuccess
  const expectedPdfs = qpPaths.length + msPaths.length
  const minRequired = Math.min(
    MIN_SUCCESSFUL_PDFS_PER_SESSION,
    Math.max(1, Math.ceil(expectedPdfs * 0.5))
  )

  const skippedByCost = [...report.qpResults, ...report.msResults].some(
    (r) => r.skipReason === 'session_cost_cap' || r.skipReason === 'global_cost_cap'
  )
  const hasFailures = report.failedPdfs.some((f) => !f.path.includes('/tagging'))
  const qpDone = report.qpResults.some((r) => r.status === 'completed' || r.status === 'failed')

  if (totalSuccess === 0) {
    report.status = qpDone ? 'failed' : 'failed'
  } else if (skippedByCost || hasFailures || totalSuccess < minRequired || report.costUsd <= 0) {
    report.status = 'partial'
  } else {
    report.status = 'completed'
  }
}

function logProgress(logPath: string, line: string): void {
  const ts = new Date().toISOString()
  appendFileSync(logPath, `[${ts}] ${line}\n`)
}

async function listSessionPdfs(
  supabase: SupabaseClient,
  subjectCode: string,
  sessionCode: string,
  kind: 'qp' | 'ms'
): Promise<string[]> {
  const prefix = `cambridge/${subjectCode}/${sessionCode}`
  const { data, error } = await supabase.storage.from('paper-pdfs').list(prefix, {
    limit: 200,
  })
  if (error) throw new Error(`Storage list failed for ${prefix}: ${error.message}`)
  const re = kind === 'qp' ? /^qp_\d{2}\.pdf$/i : /^ms_\d{2}\.pdf$/i
  return (data ?? [])
    .filter((f) => re.test(f.name))
    .map((f) => `${prefix}/${f.name}`)
    .sort()
}

async function downloadPdf(
  supabase: SupabaseClient,
  path: string
): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from('paper-pdfs').download(path)
  if (error || !data) throw new Error(error?.message ?? 'download failed')
  return (await data.arrayBuffer()).slice(0)
}

function exportSlug(pdfPath: string): string {
  return pdfPath.replace(/[/.]/g, '_')
}

function writeJsonExport(rootDir: string, pdfPath: string, payload: unknown): string {
  const outDir = join(rootDir, 'scripts', 'extraction-output')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, `${exportSlug(pdfPath)}.json`)
  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  return outPath
}

function isGemini5xx(err: unknown): boolean {
  if (isGeminiQuotaExhausted(err)) return false
  const msg = err instanceof Error ? err.message : String(err)
  return /503|500|UNAVAILABLE|high demand/i.test(msg)
}

async function runPool<T, R>(
  items: T[],
  concurrency: number | AdaptiveConcurrency,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let idx = 0
  const poolSize =
    concurrency instanceof AdaptiveConcurrency ? concurrency.value : concurrency

  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(poolSize, items.length) }, worker))
  return results
}

async function extractQuestionPaper(
  supabase: SupabaseClient,
  rootDir: string,
  pdfPath: string,
  costs: BulkCostTracker,
  runOpts: Pick<
    BulkExtractOptions,
    'perPdfTimeoutMs' | 'progressLogPath' | 'withDiagramDescriptions'
  >,
  adaptive?: AdaptiveConcurrency
): Promise<PdfResult> {
  const timeoutMs = runOpts.perPdfTimeoutMs ?? DEFAULT_PER_PDF_TIMEOUT_MS
  const skip = shouldSkipJob(await getExtractionJob(supabase, pdfPath))
  if (skip) {
    return { path: pdfPath, type: 'question-paper', status: 'skipped', skipReason: skip, costUsd: 0 }
  }

  if (costs.exceedsSessionCap() || costs.exceedsGlobalCap()) {
    return {
      path: pdfPath,
      type: 'question-paper',
      status: 'skipped',
      skipReason: 'cost_cap',
      costUsd: 0,
    }
  }

  await ensureExtractionJob(supabase, pdfPath, 'question-paper')
  let lastError = ''
  let totalCost = 0

  for (let attempt = 1; attempt <= MAX_PDF_RETRIES; attempt++) {
    try {
      await markJobRunning(supabase, pdfPath)
      resetGeminiRetryStats()

      const pdfBytes = await downloadPdf(supabase, pdfPath)
      const estimated = estimatePdfCostUsd('question-paper', {
        byteSize: pdfBytes.byteLength,
        withDiagrams: true,
      })
      if (costs.exceedsPerPdfCap(estimated)) {
        await markJobFailed(supabase, pdfPath, `Cost estimate $${estimated} exceeds per-PDF cap`, {
          cost_usd: estimated,
        })
        return {
          path: pdfPath,
          type: 'question-paper',
          status: 'failed',
          costUsd: estimated,
          error: `Per-PDF cost cap exceeded (est. $${estimated})`,
        }
      }

      const retryBefore = getGeminiRetryStats()
      const result = await withPdfTimeout(
        parseQuestionPaper({
          pdfBytes,
          sourcePdfPath: pdfPath,
          skipDiagrams: false,
          withDiagramDescriptions: runOpts.withDiagramDescriptions === true,
        }),
        timeoutMs,
        pdfPath
      )

      const cost = estimatePdfCostUsd('question-paper', {
        pageCount: result.pageCount,
        byteSize: pdfBytes.byteLength,
        withDiagrams: result.diagrams.length > 0,
      })
      totalCost = cost
      costs.add(cost)

      const diagramsMissingAi = result.diagrams.filter((d) => !d.ai_description?.trim()).length

      const payload = {
        generatedAt: new Date().toISOString(),
        sourcePdfPath: pdfPath,
        summary: {
          pageCount: result.pageCount,
          questionCount: result.questions.length,
          leafMarkSum: result.markSumValidation?.leafSum,
          expectedMarkSum: result.markSumValidation?.expected,
          markSumPass: result.markSumValidation?.pass,
          diagramCount: result.diagrams.length,
          diagramsMissingAi,
          jobStatus: result.jobStatus,
          errorMessage: result.errorMessage,
        },
        meta: result.meta,
        questions: result.questions.map((q) => ({
          id: q.id,
          question_number: q.question_number,
          question_path: q.question_path,
          parent_question_id: q.parent_question_id,
          is_leaf: q.is_leaf,
          marks: q.marks,
          question_text: q.question_text,
          extraction_confidence: q.extraction_confidence,
        })),
      }
      writeJsonExport(rootDir, pdfPath, payload)

      await persistExtractedQuestions(supabase, result.meta, result.questions, pdfPath)

      let diagramPersist: { inserted: number; skipped: number; uploads: number } | null =
        null
      if (result.diagrams.length > 0) {
        diagramPersist = await persistExtractedDiagrams(
          supabase,
          result.meta,
          result.questions,
          result.diagrams,
          pdfPath,
          { withDiagramDescriptions: runOpts.withDiagramDescriptions === true }
        )
      }

      const retryNote = getGeminiRetryStats()
      if (adaptive && retryNote.rateLimitRetries > retryBefore.rateLimitRetries) {
        adaptive.recordApiOutcome(true)
      } else if (adaptive) {
        adaptive.recordApiOutcome(false)
      }
      const notes = [result.errorMessage, retryNote.totalRetries > 0 ? `retries:${retryNote.totalRetries}` : null]
        .filter(Boolean)
        .join('; ')

      if (result.jobStatus === 'failed') {
        await markJobFailed(supabase, pdfPath, notes || 'extraction validation failed', {
          pages_processed: result.pageCount,
          questions_extracted: result.questions.length,
          diagrams_extracted: result.diagrams.length,
          cost_usd: cost,
        })
        return {
          path: pdfPath,
          type: 'question-paper',
          status: 'failed',
          costUsd: cost,
          error: notes || 'validation failed',
          questions: result.questions.length,
          diagrams: result.diagrams.length,
          diagramsMissingAi,
          markSumPass: result.markSumValidation?.pass,
          expectedMarks: result.markSumValidation?.expected ?? null,
          actualMarks: result.markSumValidation?.leafSum ?? null,
        }
      }

      await markJobCompleted(supabase, pdfPath, {
        pages_processed: result.pageCount,
        questions_extracted: result.questions.length,
        diagrams_extracted: result.diagrams.length,
        cost_usd: cost,
        error_message: notes || null,
        metadata: {
          flash_validation_skipped: result.stats.flashValidationSkipped,
          with_diagram_descriptions: runOpts.withDiagramDescriptions === true,
          diagram_persist: diagramPersist,
        },
      })

      notePdfProcessed(runOpts.progressLogPath)

      return {
        path: pdfPath,
        type: 'question-paper',
        status: 'completed',
        costUsd: cost,
        questions: result.questions.length,
        diagrams: result.diagrams.length,
        diagramsMissingAi,
        markSumPass: result.markSumValidation?.pass,
        expectedMarks: result.markSumValidation?.expected ?? null,
        actualMarks: result.markSumValidation?.leafSum ?? null,
      }
    } catch (err) {
      assertNotQuotaExhausted(err)
      lastError = err instanceof Error ? err.message : String(err)
      if (/timed out after \d+ms/.test(lastError)) {
        await markJobFailed(supabase, pdfPath, lastError, { cost_usd: totalCost })
        notePdfProcessed(runOpts.progressLogPath)
        return {
          path: pdfPath,
          type: 'question-paper',
          status: 'failed',
          costUsd: totalCost,
          error: lastError,
        }
      }
      if (attempt < MAX_PDF_RETRIES) continue
      await markJobFailed(supabase, pdfPath, lastError, { cost_usd: totalCost })
      notePdfProcessed(runOpts.progressLogPath)
      return {
        path: pdfPath,
        type: 'question-paper',
        status: 'failed',
        costUsd: totalCost,
        error: lastError,
      }
    }
  }

  return {
    path: pdfPath,
    type: 'question-paper',
    status: 'failed',
    costUsd: totalCost,
    error: lastError,
  }
}

async function extractMarkScheme(
  supabase: SupabaseClient,
  rootDir: string,
  pdfPath: string,
  costs: BulkCostTracker,
  runOpts: Pick<BulkExtractOptions, 'perPdfTimeoutMs' | 'progressLogPath'>
): Promise<PdfResult> {
  const timeoutMs = runOpts.perPdfTimeoutMs ?? DEFAULT_PER_PDF_TIMEOUT_MS
  const skip = shouldSkipJob(await getExtractionJob(supabase, pdfPath))
  if (skip) {
    return { path: pdfPath, type: 'mark-scheme', status: 'skipped', skipReason: skip, costUsd: 0 }
  }

  if (costs.exceedsSessionCap() || costs.exceedsGlobalCap()) {
    return {
      path: pdfPath,
      type: 'mark-scheme',
      status: 'skipped',
      skipReason: 'cost_cap',
      costUsd: 0,
    }
  }

  const qpPath = pdfPath.replace(/\/ms_/, '/qp_')
  const qpExportPath = join(rootDir, 'scripts', 'extraction-output', `${exportSlug(qpPath)}.json`)
  if (!existsSync(qpExportPath)) {
    return {
      path: pdfPath,
      type: 'mark-scheme',
      status: 'failed',
      costUsd: 0,
      error: `Missing QP export: ${qpExportPath}`,
    }
  }

  await ensureExtractionJob(supabase, pdfPath, 'mark-scheme')
  let lastError = ''
  let totalCost = 0

  for (let attempt = 1; attempt <= MAX_PDF_RETRIES; attempt++) {
    try {
      await markJobRunning(supabase, pdfPath)
      resetGeminiRetryStats()

      const qpExport = JSON.parse(readFileSync(qpExportPath, 'utf8'))
      const questions = loadQuestionsFromExport(qpExport)
      const pdfBytes = await downloadPdf(supabase, pdfPath)
      const estimated = estimatePdfCostUsd('mark-scheme', { byteSize: pdfBytes.byteLength })
      if (costs.exceedsPerPdfCap(estimated)) {
        await markJobFailed(supabase, pdfPath, `Cost estimate $${estimated} exceeds per-PDF cap`, {
          cost_usd: estimated,
        })
        return {
          path: pdfPath,
          type: 'mark-scheme',
          status: 'failed',
          costUsd: estimated,
          error: `Per-PDF cost cap exceeded (est. $${estimated})`,
        }
      }

      const result = await withPdfTimeout(
        linkMarkScheme({ pdfBytes, sourcePdfPath: pdfPath, questions }),
        timeoutMs,
        pdfPath
      )
      const cost = estimatePdfCostUsd('mark-scheme', {
        pageCount: result.pageCount,
        byteSize: pdfBytes.byteLength,
      })
      totalCost = cost
      costs.add(cost)

      writeJsonExport(rootDir, pdfPath, {
        generatedAt: new Date().toISOString(),
        sourcePdfPath: pdfPath,
        summary: {
          markPointCount: result.linked.length,
          totalMarkSum: result.validation.totalMarkSum,
          expectedTotal: result.validation.expectedTotal,
          totalMarkPass: result.validation.totalMarkPass,
          coveragePass: result.validation.coveragePass,
          unmatchedMsHeaders: result.validation.unmatchedMsHeaders,
          jobStatus: result.jobStatus,
        },
        markPoints: result.linked,
      })

      await persistLinkedMarkPoints(supabase, result.linked)

      const notes = [
        result.errorMessage,
        getGeminiRetryStats().totalRetries > 0
          ? `retries:${getGeminiRetryStats().totalRetries}`
          : null,
      ]
        .filter(Boolean)
        .join('; ')

      if (result.jobStatus === 'failed') {
        await markJobFailed(supabase, pdfPath, notes || 'mark scheme link failed', {
          pages_processed: result.pageCount,
          questions_extracted: result.linked.length,
          cost_usd: cost,
        })
        return {
          path: pdfPath,
          type: 'mark-scheme',
          status: 'failed',
          costUsd: cost,
          error: notes || 'link failed',
          markPoints: result.linked.length,
          markSumPass: result.validation.totalMarkPass,
          expectedMarks: result.validation.expectedTotal ?? null,
          actualMarks: result.validation.totalMarkSum ?? null,
        }
      }

      await markJobCompleted(supabase, pdfPath, {
        pages_processed: result.pageCount,
        questions_extracted: result.linked.length,
        cost_usd: cost,
        error_message: notes || null,
      })

      notePdfProcessed(runOpts.progressLogPath)

      return {
        path: pdfPath,
        type: 'mark-scheme',
        status: 'completed',
        costUsd: cost,
        markPoints: result.linked.length,
        markSumPass: result.validation.totalMarkPass,
        expectedMarks: result.validation.expectedTotal ?? null,
        actualMarks: result.validation.totalMarkSum ?? null,
      }
    } catch (err) {
      assertNotQuotaExhausted(err)
      lastError = err instanceof Error ? err.message : String(err)
      if (/timed out after \d+ms/.test(lastError)) {
        await markJobFailed(supabase, pdfPath, lastError, { cost_usd: totalCost })
        notePdfProcessed(runOpts.progressLogPath)
        return {
          path: pdfPath,
          type: 'mark-scheme',
          status: 'failed',
          costUsd: totalCost,
          error: lastError,
        }
      }
      if (attempt < MAX_PDF_RETRIES) continue
      await markJobFailed(supabase, pdfPath, lastError, { cost_usd: totalCost })
      notePdfProcessed(runOpts.progressLogPath)
      return {
        path: pdfPath,
        type: 'mark-scheme',
        status: 'failed',
        costUsd: totalCost,
        error: lastError,
      }
    }
  }

  return {
    path: pdfPath,
    type: 'mark-scheme',
    status: 'failed',
    costUsd: totalCost,
    error: lastError,
  }
}

function sessionReportMarkdown(report: SessionReport): string {
  const lines: string[] = [
    `# Bulk extraction — ${report.sessionCode}`,
    '',
    `**Status:** ${report.status}`,
    `**Started:** ${report.startedAt}`,
    `**Ended:** ${report.endedAt}`,
    `**Cost (est.):** $${report.costUsd.toFixed(2)}`,
    '',
    '## Question papers',
    '',
    '| PDF | Status | Questions | Marks | Diagrams (missing AI) | Cost |',
    '|-----|--------|-----------|-------|----------------------|------|',
  ]

  for (const r of report.qpResults) {
    const marks =
      r.expectedMarks != null
        ? `${r.actualMarks ?? '?'}/${r.expectedMarks} ${r.markSumPass ? 'PASS' : 'FAIL'}`
        : '—'
    lines.push(
      `| ${r.path.split('/').pop()} | ${r.status} | ${r.questions ?? '—'} | ${marks} | ${r.diagrams ?? '—'} (${r.diagramsMissingAi ?? 0}) | $${r.costUsd.toFixed(2)} |`
    )
  }

  lines.push('', '## Mark schemes', '', '| PDF | Status | Mark points | Total marks | Cost |', '|-----|--------|-------------|-------------|------|')
  for (const r of report.msResults) {
    const marks =
      r.expectedMarks != null
        ? `${r.actualMarks ?? '?'}/${r.expectedMarks} ${r.markSumPass ? 'PASS' : 'FAIL'}`
        : '—'
    lines.push(
      `| ${r.path.split('/').pop()} | ${r.status} | ${r.markPoints ?? '—'} | ${marks} | $${r.costUsd.toFixed(2)} |`
    )
  }

  if (report.tagging) {
    lines.push(
      '',
      '## Tagging',
      '',
      `- Questions tagged: ${report.tagging.questionsTagged}`,
      `- Total tags: ${report.tagging.totalTags}`,
      `- Low-confidence tags: ${report.tagging.lowConfidenceTags}`,
      `- Mini audit (n=${report.tagging.auditSampleSize}): **${report.tagging.auditPrimaryAccuracy != null ? (report.tagging.auditPrimaryAccuracy * 100).toFixed(1) + '%' : 'n/a'}** primary accuracy`
    )
    if (report.tagging.auditPrimaryAccuracy != null && report.tagging.auditPrimaryAccuracy < 0.75) {
      lines.push('', '> Warning: tagging accuracy below 75% on mini audit sample.')
    }
  }

  if (report.failedPdfs.length) {
    lines.push('', '## Failed PDFs', '')
    for (const f of report.failedPdfs) {
      lines.push(`- \`${f.path}\`: ${f.error}`)
    }
  }

  return lines.join('\n')
}

export async function processSession(
  supabase: SupabaseClient,
  opts: BulkExtractOptions,
  sessionCode: string,
  costs: BulkCostTracker,
  geminiState: { consecutive5xx: number; dbFailures: number },
  adaptive?: AdaptiveConcurrency
): Promise<{ report: SessionReport; hardStop: boolean; hardStopReason: string | null }> {
  const startedAt = new Date().toISOString()
  const report: SessionReport = {
    sessionCode,
    status: 'completed',
    startedAt,
    endedAt: startedAt,
    costUsd: 0,
    qpResults: [],
    msResults: [],
    failedPdfs: [],
  }

  costs.resetSession()
  logProgress(opts.progressLogPath, `SESSION ${sessionCode} start`)

  let qpPaths: string[] = []
  try {
    qpPaths = await listSessionPdfs(supabase, opts.subjectCode, sessionCode, 'qp')
  } catch (err) {
    report.status = 'failed'
    report.endedAt = new Date().toISOString()
    report.failedPdfs.push({
      path: sessionCode,
      error: err instanceof Error ? err.message : String(err),
    })
    return { report, hardStop: false, hardStopReason: null }
  }

  if (!qpPaths.length) {
    report.status = 'skipped'
    report.endedAt = new Date().toISOString()
    logProgress(opts.progressLogPath, `SESSION ${sessionCode} skipped — no QPs in storage`)
    return { report, hardStop: false, hardStopReason: null }
  }

  const sessionStartCost = costs.sessionTotal

  const qpResults = await runPool(qpPaths, adaptive ?? opts.concurrency, async (path) => {
    if (costs.exceedsGlobalCap()) {
      return {
        path,
        type: 'question-paper' as const,
        status: 'skipped' as const,
        skipReason: 'global_cost_cap',
        costUsd: 0,
      }
    }
    if (costs.exceedsSessionCap()) {
      return {
        path,
        type: 'question-paper' as const,
        status: 'skipped' as const,
        skipReason: 'session_cost_cap',
        costUsd: 0,
      }
    }
    try {
      const r = await extractQuestionPaper(supabase, opts.rootDir, path, costs, opts, adaptive)
      geminiState.consecutive5xx = 0
      geminiState.dbFailures = 0
      if (r.status === 'failed' && r.error && isGeminiQuotaExhausted(r.error)) {
        throw recordQuotaExhausted(
          opts.stateFilePath ?? join(opts.rootDir, 'tmp', 'bulk-extraction-state.json'),
          r.error,
          opts.progressLogPath
        )
      }
      if (r.status === 'failed' && r.error && isGemini5xx(r.error)) {
        geminiState.consecutive5xx++
      }
      return r
    } catch (err) {
      if (err instanceof QuotaExhaustedError) throw err
      geminiState.dbFailures++
      const msg = err instanceof Error ? err.message : String(err)
      if (isGeminiQuotaExhausted(err)) {
        throw recordQuotaExhausted(
          opts.stateFilePath ?? join(opts.rootDir, 'tmp', 'bulk-extraction-state.json'),
          err,
          opts.progressLogPath
        )
      }
      if (isGemini5xx(err)) geminiState.consecutive5xx++
      return {
        path,
        type: 'question-paper' as const,
        status: 'failed' as const,
        costUsd: 0,
        error: msg,
      }
    }
  })

  report.qpResults = qpResults
  for (const r of qpResults) {
    if (r.status === 'failed' && r.error) {
      report.failedPdfs.push({ path: r.path, error: r.error })
    }
  }

  if (costs.exceedsGlobalCap()) {
    report.status = 'partial'
    report.costUsd = costs.sessionTotal - sessionStartCost
    report.endedAt = new Date().toISOString()
    return { report, hardStop: true, hardStopReason: 'global_cost_cap' }
  }

  let msPaths: string[] = []
  try {
    msPaths = await listSessionPdfs(supabase, opts.subjectCode, sessionCode, 'ms')
  } catch (err) {
    report.status = 'partial'
    report.failedPdfs.push({
      path: `${sessionCode}/ms`,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  if (!costs.exceedsSessionCap() && msPaths.length) {
    const msResults = await runPool(msPaths, adaptive ?? opts.concurrency, async (path) => {
      if (costs.exceedsGlobalCap() || costs.exceedsSessionCap()) {
        return {
          path,
          type: 'mark-scheme' as const,
          status: 'skipped' as const,
          skipReason: 'cost_cap',
          costUsd: 0,
        }
      }
      try {
        const r = await extractMarkScheme(supabase, opts.rootDir, path, costs, opts)
        geminiState.dbFailures = 0
        if (r.status === 'failed' && r.error && isGeminiQuotaExhausted(r.error)) {
          throw recordQuotaExhausted(
            opts.stateFilePath ?? join(opts.rootDir, 'tmp', 'bulk-extraction-state.json'),
            r.error,
            opts.progressLogPath
          )
        }
        return r
      } catch (err) {
        if (err instanceof QuotaExhaustedError) throw err
        geminiState.dbFailures++
        if (isGeminiQuotaExhausted(err)) {
          throw recordQuotaExhausted(
            opts.stateFilePath ?? join(opts.rootDir, 'tmp', 'bulk-extraction-state.json'),
            err,
            opts.progressLogPath
          )
        }
        return {
          path,
          type: 'mark-scheme' as const,
          status: 'failed' as const,
          costUsd: 0,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    })
    report.msResults = msResults
    for (const r of msResults) {
      if (r.status === 'failed' && r.error) {
        report.failedPdfs.push({ path: r.path, error: r.error })
      }
    }
  }

  if (
    !costs.exceedsSessionCap() &&
    !costs.exceedsGlobalCap() &&
    qpResults.some((r) => r.status === 'completed')
  ) {
    try {
      const { loadQuestionsFromDb } = await import('./topic-tagger')

      const { bulk } = await runTopicTagging({
        rootDir: opts.rootDir,
        sessionCode,
        subjectCode: opts.subjectCode,
        persist: true,
        audit: false,
        supabase,
        concurrency: 2,
      })

      const tagCost = estimateTaggingCostUsd(bulk.questionsProcessed)
      costs.add(tagCost)

      const objectives = await getSyllabusObjectives(supabase, opts.subjectCode)
      const questions = await loadQuestionsFromDb(supabase, opts.subjectCode, sessionCode, {
        leavesOnly: true,
      })

      const objectiveByNumber = new Map(objectives.map((o) => [o.objective_number, o]))
      const questionById = new Map(questions.map((q) => [q.id, q]))
      const refinedResults = bulk.results.map((r) => {
        const q = questionById.get(r.question_id)
        if (!q) return r
        return {
          ...r,
          tags: refineValidatedTags(q.question_text, r.tags, q.paper_number, objectiveByNumber),
        }
      })

      const audit = await auditTagSample(refinedResults, questions, objectiveByNumber, {
        sampleSize: 10,
        perPaper: 2,
        stratified: true,
        auditSeed: `${opts.subjectCode}-${sessionCode}-mini`,
      })

      report.tagging = {
        questionsTagged: bulk.questionsTagged,
        totalTags: bulk.totalTags,
        lowConfidenceTags: bulk.lowConfidenceTags,
        auditPrimaryAccuracy: audit.primaryAccuracy,
        auditSampleSize: audit.sampleSize,
      }
    } catch (err) {
      report.failedPdfs.push({
        path: `${sessionCode}/tagging`,
        error: err instanceof Error ? err.message : String(err),
      })
      report.status = 'partial'
    }
  }

  report.costUsd = costs.sessionTotal - sessionStartCost
  finalizeSessionStatus(report, qpPaths, msPaths)
  report.endedAt = new Date().toISOString()
  logProgress(
    opts.progressLogPath,
    `SESSION ${sessionCode} done status=${report.status} cost=$${report.costUsd.toFixed(2)}`
  )

  const hardStop =
    costs.exceedsGlobalCap() ||
    geminiState.dbFailures >= MAX_DB_FAILURES ||
    geminiState.consecutive5xx >= MAX_GEMINI_5XX_STREAK

  let hardStopReason: string | null = null
  if (costs.exceedsGlobalCap()) hardStopReason = 'global_cost_cap'
  else if (geminiState.dbFailures >= MAX_DB_FAILURES) hardStopReason = 'db_connection_lost'
  else if (geminiState.consecutive5xx >= MAX_GEMINI_5XX_STREAK) {
    hardStopReason = 'gemini_api_failure'
    await new Promise((r) => setTimeout(r, 60_000))
  }

  const reportDir = join(opts.rootDir, 'docs', 'bulk-extraction')
  mkdirSync(reportDir, { recursive: true })
  const reportName = `${sessionCode}-${opts.subjectCode}-report.md`
  writeFileSync(join(reportDir, reportName), sessionReportMarkdown(report))

  return { report, hardStop, hardStopReason }
}

async function queryDataLayerStats(supabase: SupabaseClient) {
  const tables = [
    'extracted_questions',
    'extracted_mark_points',
    'question_topic_tags',
    'extracted_diagrams',
  ] as const
  const counts: Record<string, number> = {}
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
    counts[t] = count ?? 0
  }

  const { data: coverage } = await supabase
    .from('extracted_questions')
    .select('paper_number, year, session')
  const matrix = new Map<string, number>()
  for (const row of coverage ?? []) {
    const key = `P${row.paper_number} ${row.year} ${row.session}`
    matrix.set(key, (matrix.get(key) ?? 0) + 1)
  }

  return { counts, coverageMatrix: [...matrix.entries()].sort((a, b) => a[0].localeCompare(b[0])) }
}

async function contentSourceSanity(supabase: SupabaseClient) {
  const tuples: Array<[string, string, string]> = [
    ['9702', '4', '14.3'],
    ['9702', '1', '2.1'],
    ['9702', '3', '1.3'],
    ['9702', '4', '25.3'],
    ['9702', '2', '7.1'],
  ]
  const results = []
  for (const [subject, paper, topic] of tuples) {
    const evidence = await getLessonEvidence(subject, paper, topic, { supabase })
    const sample = evidence.questions[0]?.question_text?.slice(0, 120) ?? '(none)'
    results.push({
      tuple: `${subject} P${paper} ${topic}`,
      objectives: evidence.objectives.length,
      questions: evidence.questions.length,
      markPoints: evidence.markSchemes.length,
      sample,
    })
  }
  return results
}

function writeFinalReport(
  rootDir: string,
  result: BulkExtractResult,
  dataStats: Awaited<ReturnType<typeof queryDataLayerStats>>,
  sanity: Awaited<ReturnType<typeof contentSourceSanity>>
): void {
  const dir = join(rootDir, 'docs', 'bulk-extraction')
  mkdirSync(dir, { recursive: true })

  const completed = result.sessions.filter((s) => s.status === 'completed').length
  const partial = result.sessions.filter((s) => s.status === 'partial').length
  const failed = result.sessions.filter((s) => s.status === 'failed' || s.status === 'skipped').length

  const totalQp = result.sessions.reduce((n, s) => n + s.qpResults.filter((r) => r.status === 'completed').length, 0)
  const totalMs = result.sessions.reduce((n, s) => n + s.msResults.filter((r) => r.status === 'completed').length, 0)

  const critical = result.sessions.flatMap((s) =>
    s.failedPdfs.filter((f) => !f.path.includes('/tagging'))
  )
  const qualityFlags = result.sessions.filter(
    (s) =>
      (s.tagging?.auditPrimaryAccuracy != null && s.tagging.auditPrimaryAccuracy < 0.8) ||
      s.qpResults.some(
        (r) =>
          r.markSumPass === false &&
          r.expectedMarks != null &&
          r.actualMarks != null &&
          Math.abs(r.actualMarks - r.expectedMarks) / r.expectedMarks > 0.1
      )
  )

  const lines: string[] = [
    '# Overnight bulk extraction — final report',
    '',
    `**Generated:** ${result.endedAt}`,
    '',
    '## Executive summary',
    '',
    `- Sessions: ${result.sessions.length} attempted, ${completed} completed, ${partial} partial, ${failed} failed/skipped`,
    `- PDFs: ${totalQp} QPs + ${totalMs} MSs completed`,
    `- Total cost (est.): **$${result.globalCostUsd.toFixed(2)}**`,
    `- Wall clock: ${result.startedAt} → ${result.endedAt}`,
    `- Hard stop: ${result.hardStop ? `YES — ${result.hardStopReason}` : 'No (natural completion)'}`,
    '',
    '## Per-session breakdown',
    '',
  ]

  for (const s of result.sessions) {
    lines.push(
      `### ${s.sessionCode}`,
      `- Status: ${s.status}`,
      `- QPs: ${s.qpResults.filter((r) => r.status === 'completed').length}/${s.qpResults.length}`,
      `- MSs: ${s.msResults.filter((r) => r.status === 'completed').length}/${s.msResults.length}`,
      `- Cost: $${s.costUsd.toFixed(2)}`,
      `- Tagging audit: ${s.tagging?.auditPrimaryAccuracy != null ? (s.tagging.auditPrimaryAccuracy * 100).toFixed(1) + '%' : 'n/a'}`,
      `- Report: [${s.sessionCode}-report.md](./${s.sessionCode}-report.md)`,
      ''
    )
  }

  lines.push('## Issues for awake review', '', '### Critical', '')
  if (!critical.length) lines.push('None.')
  else for (const c of critical) lines.push(`- \`${c.path}\`: ${c.error}`)

  lines.push('', '### Quality flags', '')
  if (!qualityFlags.length) lines.push('None.')
  else
    for (const s of qualityFlags) {
      lines.push(`- ${s.sessionCode}: see session report`)
    }

  lines.push('', '## Data layer state', '')
  for (const [t, n] of Object.entries(dataStats.counts)) {
    lines.push(`- ${t}: ${n}`)
  }
  lines.push('', '### Coverage matrix', '')
  for (const [k, n] of dataStats.coverageMatrix) {
    lines.push(`- ${k}: ${n} questions`)
  }

  lines.push('', '## Content-source sanity', '')
  for (const r of sanity) {
    lines.push(
      `- **${r.tuple}**: ${r.objectives} objectives, ${r.questions} questions, ${r.markPoints} mark points`,
      `  - Sample: ${r.sample}`
    )
  }

  const systemicIssues = qualityFlags.length >= 3 || result.hardStop
  lines.push(
    '',
    '## Recommendations',
    '',
    systemicIssues
      ? '- **Phase 11c (2020-2021) needs investigation first** — review quality flags and failed PDFs before expanding.'
      : '- **Phase 11c (2020-2021) is ready to run** if per-session reports look acceptable.',
    '- Review sessions with tagging audit <80% before Prompt B v2 lesson generation.'
  )

  writeFileSync(join(dir, 'overnight-final-report.md'), lines.join('\n'))
}

async function runSubjectWorker(
  supabase: SupabaseClient,
  opts: BulkExtractOptions,
  subjectCode: string,
  sharedCosts: BulkCostTracker
): Promise<{
  subjectCode: string
  status: 'completed' | 'partial' | 'failed'
  sessions: SessionReport[]
  hardStop: boolean
  hardStopReason: string | null
}> {
  const progressLogPath =
    opts.subjects && opts.subjects.length > 1
      ? join(opts.rootDir, 'tmp', `bulk-extraction-${subjectCode}.log`)
      : opts.progressLogPath

  const subjectOpts: BulkExtractOptions = {
    ...opts,
    subjectCode,
    progressLogPath,
    concurrency: opts.concurrencyPerSubject ?? opts.concurrency,
  }

  const adaptive = new AdaptiveConcurrency(subjectOpts.concurrency, { max: 15 })
  const geminiState = { consecutive5xx: 0, dbFailures: 0 }
  const sessions: SessionReport[] = []
  let hardStop = false
  let hardStopReason: string | null = null

  logProgress(
    progressLogPath,
    `SUBJECT ${subjectCode} START sessions=${subjectOpts.sessions.join(',')} concurrency=${subjectOpts.concurrency}`
  )

  for (const sessionCode of subjectOpts.sessions) {
    if (sessionCode === 's24' && subjectCode === '9702') {
      logProgress(progressLogPath, 'SESSION s24 skipped (pilot complete)')
      continue
    }

    try {
      const { report, hardStop: stop, hardStopReason: reason } = await processSession(
        supabase,
        subjectOpts,
        sessionCode,
        sharedCosts,
        geminiState,
        adaptive
      )
      sessions.push(report)
      if (stop) {
        hardStop = true
        hardStopReason = reason
        logProgress(progressLogPath, `HARD STOP: ${reason}`)
        break
      }
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        hardStop = true
        hardStopReason = 'quota_exhausted'
        logProgress(progressLogPath, `HARD STOP: quota_exhausted`)
        break
      }
      throw err
    }
  }

  const completed = sessions.filter((s) => s.status === 'completed').length
  const partial = sessions.filter((s) => s.status === 'partial').length
  const status: 'completed' | 'partial' | 'failed' =
    completed === sessions.length && sessions.length > 0
      ? 'completed'
      : partial > 0 || completed > 0
        ? 'partial'
        : 'failed'

  logProgress(
    progressLogPath,
    `SUBJECT ${subjectCode} END status=${status} sessions=${sessions.length} adaptiveConcurrency=${adaptive.value}`
  )

  return { subjectCode, status, sessions, hardStop, hardStopReason }
}

export async function runMultiSubjectBulk(
  supabase: SupabaseClient,
  opts: BulkExtractOptions
): Promise<MultiSubjectBulkResult> {
  setGeminiCallTimeoutMs(opts.callTimeoutMs ?? DEFAULT_GEMINI_CALL_TIMEOUT_MS)
  const subjects = opts.subjects?.length ? opts.subjects : [opts.subjectCode]
  const startedAt = new Date().toISOString()
  const costs = new BulkCostTracker({
    globalCostCap: opts.globalCostCap,
    perSessionCostCap: opts.perSessionCostCap,
    perPdfCostCap: opts.perPdfCostCap,
  })

  mkdirSync(join(opts.rootDir, 'docs', 'bulk-extraction'), { recursive: true })
  pdfsProcessedThisRun = 0

  const staleReset = await resetStaleRunningJobs(supabase)
  if (staleReset > 0) {
    logProgress(opts.progressLogPath, `STALE JOBS reset=${staleReset}`)
  }

  const stateFilePath =
    opts.stateFilePath ?? join(opts.rootDir, 'tmp', 'bulk-extraction-state.json')
  await waitIfQuotaBlocked(stateFilePath, (line) => logProgress(opts.progressLogPath, line))

  logProgress(
    opts.progressLogPath,
    `MULTI-SUBJECT START subjects=${subjects.join(',')} concurrencyPerSubject=${opts.concurrencyPerSubject ?? opts.concurrency} callTimeoutMs=${opts.callTimeoutMs ?? DEFAULT_GEMINI_CALL_TIMEOUT_MS}`
  )

  const settled = await Promise.allSettled(
    subjects.map((subject) => runSubjectWorker(supabase, opts, subject, costs))
  )

  const perSubject: MultiSubjectBulkResult['perSubject'] = []
  const sessions: SessionReport[] = []
  let hardStop = false
  let hardStopReason: string | null = null

  settled.forEach((outcome, index) => {
    const subjectCode = subjects[index] ?? 'unknown'
    if (outcome.status === 'fulfilled') {
      perSubject.push({
        subjectCode: outcome.value.subjectCode,
        status: outcome.value.status,
        globalCostUsd: outcome.value.sessions.reduce((n, s) => n + s.costUsd, 0),
        sessions: outcome.value.sessions,
      })
      sessions.push(...outcome.value.sessions)
      if (outcome.value.hardStop) {
        hardStop = true
        hardStopReason = outcome.value.hardStopReason
      }
    } else {
      perSubject.push({
        subjectCode,
        status: 'failed',
        globalCostUsd: 0,
        sessions: [],
      })
      logProgress(
        opts.progressLogPath,
        `SUBJECT ${subjectCode} FAILED ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`
      )
    }
  })

  const endedAt = new Date().toISOString()
  const result: MultiSubjectBulkResult = {
    startedAt,
    endedAt,
    hardStop,
    hardStopReason,
    globalCostUsd: costs.globalTotal,
    sessions,
    perSubject,
  }

  const dataStats = await queryDataLayerStats(supabase)
  const sanity = await contentSourceSanity(supabase)
  writeFinalReport(opts.rootDir, result, dataStats, sanity)
  logProgress(
    opts.progressLogPath,
    `MULTI-SUBJECT END cost=$${costs.globalTotal.toFixed(2)} hardStop=${hardStop}`
  )

  return result
}

export async function runBulkExtract(
  supabase: SupabaseClient,
  opts: BulkExtractOptions
): Promise<BulkExtractResult> {
  setGeminiCallTimeoutMs(opts.callTimeoutMs ?? DEFAULT_GEMINI_CALL_TIMEOUT_MS)
  if (opts.subjects && opts.subjects.length > 1) {
    return runMultiSubjectBulk(supabase, opts)
  }
  const startedAt = new Date().toISOString()
  const costs = new BulkCostTracker({
    globalCostCap: opts.globalCostCap,
    perSessionCostCap: opts.perSessionCostCap,
    perPdfCostCap: opts.perPdfCostCap,
  })
  const adaptive = new AdaptiveConcurrency(opts.concurrency, { max: 15 })
  const geminiState = { consecutive5xx: 0, dbFailures: 0 }
  const sessions: SessionReport[] = []
  let hardStop = false
  let hardStopReason: string | null = null

  mkdirSync(join(opts.rootDir, 'docs', 'bulk-extraction'), { recursive: true })
  pdfsProcessedThisRun = 0

  const staleReset = await resetStaleRunningJobs(supabase)
  if (staleReset > 0) {
    logProgress(opts.progressLogPath, `STALE JOBS reset=${staleReset}`)
  }

  const stateFilePath =
    opts.stateFilePath ?? join(opts.rootDir, 'tmp', 'bulk-extraction-state.json')

  await waitIfQuotaBlocked(stateFilePath, (line) => logProgress(opts.progressLogPath, line))

  logProgress(
    opts.progressLogPath,
    `BULK START subject=${opts.subjectCode} sessions=${opts.sessions.join(',')} concurrency=${opts.concurrency} perPdfTimeoutMs=${opts.perPdfTimeoutMs ?? DEFAULT_PER_PDF_TIMEOUT_MS} callTimeoutMs=${opts.callTimeoutMs ?? DEFAULT_GEMINI_CALL_TIMEOUT_MS}`
  )

  const heartbeat = setInterval(() => {
    logProgress(
      opts.progressLogPath,
      `HEARTBEAT pdfs=${pdfsProcessedThisRun} adaptiveConcurrency=${adaptive.value} ${formatMemoryLine()}`
    )
  }, HEARTBEAT_INTERVAL_MS)

  let result: BulkExtractResult

  try {
    for (const sessionCode of opts.sessions) {
      if (sessionCode === 's24' && opts.subjectCode === '9702') {
        logProgress(opts.progressLogPath, 'SESSION s24 skipped (pilot complete)')
        continue
      }

      try {
        const { report, hardStop: stop, hardStopReason: reason } = await processSession(
          supabase,
          { ...opts, stateFilePath },
          sessionCode,
          costs,
          geminiState,
          adaptive
        )
        sessions.push(report)

        if (stop) {
          hardStop = true
          hardStopReason = reason
          logProgress(opts.progressLogPath, `HARD STOP: ${reason}`)
          break
        }
      } catch (err) {
        if (err instanceof QuotaExhaustedError) {
          hardStop = true
          hardStopReason = 'quota_exhausted'
          logProgress(opts.progressLogPath, `HARD STOP: quota_exhausted until ${err.retryAfter}`)
          break
        }
        throw err
      }
    }

    const endedAt = new Date().toISOString()
    result = {
      startedAt,
      endedAt,
      hardStop,
      hardStopReason,
      globalCostUsd: costs.globalTotal,
      sessions,
    }

    const dataStats = await queryDataLayerStats(supabase)
    const sanity = await contentSourceSanity(supabase)
    writeFinalReport(opts.rootDir, result, dataStats, sanity)
    logProgress(opts.progressLogPath, `BULK END cost=$${costs.globalTotal.toFixed(2)} hardStop=${hardStop}`)
  } finally {
    clearInterval(heartbeat)
  }

  return result!
}
