/**
 * Prompt C Phase 2 — question paper parser + splitter.
 * Primary extractor: Gemini 2.5 Pro. Mathpix feature-flagged off.
 */

import {
  DEFAULT_EXTRACTION_METHOD,
  LOW_EXTRACTION_CONFIDENCE_THRESHOLD,
  MAX_EXTRACTION_RETRIES,
  isMathpixEnabled,
} from './config'
import { extractQuestionsWithGemini } from './gemini-extractor'
import { extractDiagramsForPages } from './diagram-extractor'
import { getPdfPageCount } from './pdf-page-render'
import { katexConfidenceScore, summarizeKatexValidation } from './katex-validate'
import { validateQuestionLatex } from './latex-validate'
import { parseQuestionPaperPath, type ParsedPaperMeta } from './paper-meta'
import {
  formatManualReviewMessage,
  splitQuestions,
  type SplitQuestion,
} from './question-splitter'
import { assignQuestionTreeIds, type QuestionWithIds } from './question-tree'
import { validateMarkSum } from './mark-sum-validate'
import { getGeminiRetryStats, resetGeminiRetryStats } from '@/lib/marking/gemini-retry'
import type { DetectedDiagram } from './diagram-extractor'
import type { LatexValidationResult } from './latex-validate'
import type { KatexValidationSummary } from './katex-validate'

export type ValidatedQuestion = SplitQuestion & {
  extraction_method: typeof DEFAULT_EXTRACTION_METHOD
  extraction_confidence: number
  needs_manual_review: boolean
  needs_re_extraction: boolean
  validation: {
    katex: KatexValidationSummary
    latex: LatexValidationResult | null
  }
  raw_extraction_data: Record<string, unknown>
}

export type ValidatedQuestionWithIds = QuestionWithIds

export const HIGH_CONFIDENCE_LATEX_SKIP_THRESHOLD = 0.92

export function shouldSkipFlashLatexValidation(
  katex: KatexValidationSummary,
  katexScore: number,
  skipLatexValidation: boolean
): boolean {
  return (
    !skipLatexValidation &&
    katex.allParseable &&
    katexScore >= HIGH_CONFIDENCE_LATEX_SKIP_THRESHOLD
  )
}

export type ParseQuestionPaperOptions = {
  pdfBytes: ArrayBuffer
  sourcePdfPath: string
  /** Skip diagram region detection (faster dry-runs). */
  skipDiagrams?: boolean
  /** Skip per-question Flash LaTeX validation (faster dry-runs). */
  skipLatexValidation?: boolean
  /** When false (default), crop diagrams without Gemini Pro alt-text. */
  withDiagramDescriptions?: boolean
  /** Prior retry counts keyed by question_number (for re-extraction runs). */
  priorRetries?: Record<string, number>
}

export type ParseQuestionPaperStats = {
  flashValidationSkipped: number
}

export type ParseQuestionPaperResult = {
  meta: ParsedPaperMeta
  questions: ValidatedQuestionWithIds[]
  diagrams: DetectedDiagram[]
  chunksProcessed: number
  singleShot: boolean
  markSumValidation: ReturnType<typeof validateMarkSum>
  diagramPassMs: number | null
  manualReview: Array<{ question_number: string; reasons: string[] }>
  pageCount: number
  splitterIssues: string[]
  extractionMethod: typeof DEFAULT_EXTRACTION_METHOD | 'mathpix'
  jobStatus: 'completed' | 'failed'
  errorMessage: string | null
  stats: ParseQuestionPaperStats
}

async function maybeExtractWithMathpix(
  _pdfBytes: ArrayBuffer,
  _meta: ParsedPaperMeta
): Promise<null> {
  if (!isMathpixEnabled()) return null
  // Mathpix path preserved in mathpix-client.mjs — wire when EXTRACTION_USE_MATHPIX=true
  return null
}

function computeConfidence(
  katexScore: number,
  latexResult: LatexValidationResult | null,
  skippedLatexValidation: boolean
): number {
  let score = katexScore
  if (latexResult && !latexResult.passes) {
    score = Math.min(score, 0.55)
  }
  if (!skippedLatexValidation && latexResult?.issues.length) {
    score = Math.min(score, 0.7)
  }
  return Math.round(score * 100) / 100
}

async function validateQuestion(
  q: SplitQuestion,
  meta: ParsedPaperMeta,
  opts: { skipLatexValidation: boolean; priorRetry: number }
): Promise<ValidatedQuestion> {
  const katex = summarizeKatexValidation(q.question_text)
  let katexScore = katexConfidenceScore(q.question_text)

  if (!katex.allParseable && katex.fragmentCount > 0) {
    katexScore = Math.min(katexScore, LOW_EXTRACTION_CONFIDENCE_THRESHOLD - 0.01)
  }

  let latex: LatexValidationResult | null = null
  let skippedFlashValidation = false
  const canSkipFlash = shouldSkipFlashLatexValidation(
    katex,
    katexScore,
    opts.skipLatexValidation
  )

  if (!opts.skipLatexValidation && !canSkipFlash) {
    try {
      latex = await validateQuestionLatex(q.question_text, {
        questionNumber: q.question_number,
        paperLabel: `${meta.subjectCode} P${meta.paperNumber} v${meta.variant}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      latex = {
        passes: false,
        issues: [`Flash validation skipped (${message.slice(0, 120)})`],
        subscriptsOk: true,
        superscriptsOk: true,
        specialCharsOk: true,
      }
    }
  } else if (canSkipFlash) {
    skippedFlashValidation = true
  }

  const extraction_confidence = computeConfidence(
    katexScore,
    latex,
    opts.skipLatexValidation
  )

  const katexFailed = !katex.allParseable && katex.fragmentCount > 0
  const latexFailed = Boolean(latex && !latex.passes)

  const reasons: string[] = []
  if (katexFailed) {
    reasons.push(
      `KaTeX parse errors: ${katex.failedFragments.map((f) => f.fragment).join(', ')}`
    )
  }
  if (latexFailed && latex) {
    reasons.push(...latex.issues)
  }

  const retryCount = opts.priorRetry + (katexFailed ? 1 : 0)

  // Flash validation failure → manual review immediately (never auto-correct).
  const needs_manual_review =
    latexFailed ||
    (katexFailed && retryCount >= MAX_EXTRACTION_RETRIES)

  const needs_re_extraction =
    katexFailed &&
    !latexFailed &&
    retryCount < MAX_EXTRACTION_RETRIES

  if (katexFailed && retryCount >= MAX_EXTRACTION_RETRIES) {
    reasons.push(`Exceeded max KaTeX retries (${MAX_EXTRACTION_RETRIES})`)
  }

  return {
    ...q,
    extraction_method: DEFAULT_EXTRACTION_METHOD,
    extraction_confidence,
    needs_manual_review:
      needs_manual_review || retryCount >= MAX_EXTRACTION_RETRIES,
    needs_re_extraction,
    validation: { katex, latex },
    raw_extraction_data: {
      options: q.options,
      tables: q.tables,
      figure_refs: q.figure_refs,
      validation_reasons: reasons,
      retry_count: retryCount,
      flash_validation_skipped: skippedFlashValidation,
    },
  }
}

export function collectDiagramPages(
  questions: SplitQuestion[],
  _meta: ParsedPaperMeta,
  pageCount: number
): number[] {
  const unique = new Set<number>()
  for (const q of questions) {
    for (const p of q.source_page_numbers) {
      if (p >= 1 && p <= pageCount) unique.add(p)
    }
    const refs = (q as { figure_refs?: string[] }).figure_refs
    if (Array.isArray(refs)) {
      for (const ref of refs) {
        const m = ref.match(/p(?:age)?\s*(\d+)/i)
        if (m) {
          const p = parseInt(m[1], 10)
          if (p >= 1 && p <= pageCount) unique.add(p)
        }
      }
    }
  }
  return [...unique].sort((a, b) => a - b)
}

/**
 * Parse a question paper PDF into validated, split questions + diagrams.
 */
export async function parseQuestionPaper(
  opts: ParseQuestionPaperOptions
): Promise<ParseQuestionPaperResult> {
  const meta = parseQuestionPaperPath(opts.sourcePdfPath)
  if (!meta) {
    throw new Error(`Unrecognized question paper path: ${opts.sourcePdfPath}`)
  }

  resetGeminiRetryStats()

  // Clone so pdf-lib / Gemini uploads cannot detach the buffer before diagram rendering.
  const pdfBytes = opts.pdfBytes.slice(0)
  const diagramPdfBytes = pdfBytes.slice(0)

  const mathpixResult = await maybeExtractWithMathpix(pdfBytes, meta)
  if (mathpixResult) {
    // Future: map Mathpix output through same splitter/validation pipeline
  }

  const gemini = await extractQuestionsWithGemini(pdfBytes, meta)
  const pageCount =
    gemini.page_count > 0
      ? gemini.page_count
      : await getPdfPageCount(diagramPdfBytes).catch(() => 0)

  const { questions: split, issues: splitterIssues } = splitQuestions(
    gemini.questions,
    meta
  )

  const validated: ValidatedQuestion[] = []
  let flashValidationSkipped = 0
  for (const q of split) {
    const priorRetry = opts.priorRetries?.[q.question_number] ?? 0
    const row = await validateQuestion(q, meta, {
      skipLatexValidation: opts.skipLatexValidation ?? false,
      priorRetry,
    })
    if (row.raw_extraction_data.flash_validation_skipped === true) {
      flashValidationSkipped++
    }
    validated.push(row)
  }

  const manualReview = validated
    .filter((q) => q.needs_manual_review)
    .map((q) => ({
      question_number: q.question_number,
      reasons: (q.raw_extraction_data.validation_reasons as string[]) ?? [],
    }))

  let diagrams: DetectedDiagram[] = []
  let diagramPassMs: number | null = null
  let diagramError: string | null = null
  if (!opts.skipDiagrams && pageCount > 0) {
    const pages = collectDiagramPages(split, meta, pageCount)
    if (pages.length > 0) {
      const t0 = Date.now()
      try {
        diagrams = await extractDiagramsForPages(diagramPdfBytes, pages, {
          withDiagramDescriptions: opts.withDiagramDescriptions === true,
        })
        diagramPassMs = Date.now() - t0
      } catch (err) {
        diagramPassMs = Date.now() - t0
        diagramError =
          err instanceof Error ? err.message : String(err)
      }
    }
  }

  const markSumValidation = validateMarkSum(validated, meta)
  const retryStats = getGeminiRetryStats()

  const errorParts: string[] = []
  if (diagramError) {
    errorParts.push(`Diagram extraction failed: ${diagramError}`)
  }
  const manualMsg = formatManualReviewMessage(manualReview)
  if (manualMsg) errorParts.push(manualMsg)
  if (!markSumValidation.pass && markSumValidation.message) {
    errorParts.push(markSumValidation.message)
  }
  if (retryStats.totalRetries > 0) {
    errorParts.push(
      `Gemini API retries: ${retryStats.totalRetries} (last: ${retryStats.lastLabel ?? 'unknown'})`
    )
  }

  const errorMessage = errorParts.length > 0 ? errorParts.join('\n\n') : null
  const withIds = assignQuestionTreeIds(validated)

  const jobStatus =
    split.length === 0 || !markSumValidation.pass ? 'failed' : 'completed'

  return {
    meta,
    questions: withIds,
    diagrams,
    manualReview,
    pageCount,
    splitterIssues,
    chunksProcessed: gemini.chunks_processed ?? 1,
    singleShot: gemini.single_shot ?? false,
    markSumValidation,
    diagramPassMs,
    extractionMethod: DEFAULT_EXTRACTION_METHOD,
    jobStatus,
    errorMessage,
    stats: { flashValidationSkipped },
  }
}
