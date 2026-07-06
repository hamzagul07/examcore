import fs from 'fs'
import path from 'path'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import type { CourseLesson } from '@/lib/courses/types'
import { sanitizeRawLesson } from '@/lib/courses/generator/sanitize-raw-lesson'
import { requiresHumanReviewBeforePublish } from './subject-publish-policy'
import {
  REGENERATION_FIXABLE_CODES,
  regenerationEligiblePathsFromAudit,
} from './lesson-improve-routing'
import { createGuardedWriter } from './guardrail'
import { estimateLessonCoverageScore } from './lesson-coverage-score'
import {
  verifyPublishedLessonJson,
  PublishedLessonVerifySchema,
} from './verify-published-lesson'
import { resolvePaperMeta } from '@/lib/courses/content-source'
import { getQualityTargets } from '@/lib/courses/generator/quality-targets'
import { SYLLABUS_OUTCOMES } from '@/lib/courses/syllabus-objectives'
import {
  draftIntroducedKatexRegression,
  lessonKatexErrors,
  sanitizeLessonKatex,
} from './lesson-katex-sanitize'

export type LessonImproveMetrics = {
  coverageScore: number
  workedExampleCount: number
  flashcardCount: number
  errorCodes: string[]
  passed: boolean
}

export type CompareGateResult = {
  promote: boolean
  rejectReasons: string[]
  fixedCodes: string[]
  regressedCodes: string[]
}

export function measureLesson(
  lesson: unknown,
  filePath: string,
  subjectCode: string
): LessonImproveMetrics {
  const parsed = lesson as CourseLesson
  const result = verifyPublishedLessonJson(lesson, filePath, subjectCode, {
    auditStrict: true,
  })
  const { score } = estimateLessonCoverageScore(
    parsed,
    subjectCode,
    parsed.topicCode ?? ''
  )
  return {
    coverageScore: score,
    workedExampleCount: parsed.sections.filter((s) => s.type === 'workedExample').length,
    flashcardCount: parsed.flashcards?.length ?? 0,
    errorCodes: result.issues.filter((i) => i.severity === 'error').map((i) => i.code),
    passed: result.ok,
  }
}

export function compareImprovementGate(
  baseline: LessonImproveMetrics,
  draft: LessonImproveMetrics
): CompareGateResult {
  const rejectReasons: string[] = []
  const baselineErrors = new Set(baseline.errorCodes)
  const draftErrors = new Set(draft.errorCodes)

  const fixedCodes = [...baselineErrors].filter((c) => !draftErrors.has(c))
  const regressedCodes = [...draftErrors].filter((c) => !baselineErrors.has(c))

  if (regressedCodes.length) {
    rejectReasons.push(`Regression on: ${regressedCodes.join(', ')}`)
  }

  if (draft.coverageScore < baseline.coverageScore - 0.01) {
    rejectReasons.push(
      `Coverage score regressed (${baseline.coverageScore.toFixed(2)} -> ${draft.coverageScore.toFixed(2)})`
    )
  }
  if (draft.workedExampleCount < baseline.workedExampleCount) {
    rejectReasons.push('Worked example count regressed')
  }
  if (draft.flashcardCount < baseline.flashcardCount) {
    rejectReasons.push('Flashcard count regressed')
  }

  const allBaselineFixed = [...baselineErrors].every((c) => !draftErrors.has(c))
  if (!allBaselineFixed) {
    rejectReasons.push(
      `Unfixed checks: ${[...baselineErrors].filter((c) => draftErrors.has(c)).join(', ')}`
    )
  }

  const promote =
    rejectReasons.length === 0 &&
    allBaselineFixed &&
    baseline.errorCodes.length > 0

  return { promote, rejectReasons, fixedCodes, regressedCodes }
}

function paperNumberFromContext(lesson: CourseLesson, relPath: string): string {
  if (lesson.paperNumber) return String(lesson.paperNumber)
  const pathMatch = relPath.match(/paper-(\d+)/i)
  if (pathMatch) return pathMatch[1]
  const paperMatch = String(lesson.paper ?? '').match(/P(\d+)/i)
  if (paperMatch) return paperMatch[1]
  return '1'
}

function enrichLegacyLessonFields(
  lesson: Record<string, unknown>,
  subjectCode: string,
  relPath: string
): Record<string, unknown> {
  const topicCode = String(lesson.topicCode ?? '')
  const paperNumber = paperNumberFromContext(lesson as CourseLesson, relPath)
  const meta = resolvePaperMeta(subjectCode, paperNumber)
  const objectives = (SYLLABUS_OUTCOMES[subjectCode] ?? [])
    .filter((o) => o.topic === topicCode)
    .map((o) => o.code)
  const existing = Array.isArray(lesson.syllabusObjectivesCovered)
    ? lesson.syllabusObjectivesCovered.map(String).filter(Boolean)
    : []

  return {
    ...lesson,
    paperNumber: lesson.paperNumber ?? paperNumber,
    paperType: lesson.paperType ?? meta.paperKind,
    level: lesson.level ?? meta.level,
    syllabusObjectivesCovered:
      existing.length > 0
        ? existing
        : objectives.length > 0
          ? objectives
          : topicCode
            ? [topicCode]
            : [],
  }
}

function improvePilotPath(originalRel: string): string {
  return originalRel.replace(/\.json$/, '.improve.pilot.json')
}

function buildImprovePrompt(
  original: CourseLesson,
  baseline: LessonImproveMetrics,
  subjectCode: string,
  opts: { katexFeedback?: string[] } = {}
): string {
  const targets = getQualityTargets(subjectCode, 'premium')
  const needWorked = Math.max(0, targets.minWorkedExamples - baseline.workedExampleCount)
  const needFlashcards = Math.max(0, targets.minFlashcards - baseline.flashcardCount)

  const katexBlock =
    opts.katexFeedback?.length ?
      `\nCRITICAL - your previous draft had INVALID KaTeX. Fix before returning:\n${opts.katexFeedback.map((e) => `- ${e}`).join('\n')}\n- Escape % as \\\\% inside math. Use ^{...} not Unicode superscripts.\n`
    : ''

  return `You are improving an existing Cambridge ${subjectCode} course lesson JSON.

The lesson currently FAILS these quality checks:
${baseline.errorCodes.map((c) => `- ${c}`).join('\n')}

Metrics: coverage=${baseline.coverageScore.toFixed(2)} (need >=${targets.minCoverageScore}), workedExamples=${baseline.workedExampleCount} (need >=${targets.minWorkedExamples}), flashcards=${baseline.flashcardCount} (need >=${targets.minFlashcards})
${katexBlock}
Rules:
- Preserve accurate teaching content that already works; ADD depth where checks fail.
${needWorked > 0 ? `- ADD ${needWorked} new workedExample section(s) - end with at least ${targets.minWorkedExamples} total.` : '- Keep all existing workedExample sections.'}
- Each workedExample MUST have REAL NUMERIC values (figures, formulas, step-by-step working, units, final answer). No template stubs.
- Hollow worked examples (bullet lists without calculations) will FAIL validation.
${needFlashcards > 0 ? `- ADD ${needFlashcards} new flashcards - end with at least ${targets.minFlashcards} total.` : '- Keep flashcard count at or above current level.'}
- Need at least ${targets.minHeadingGroups} heading sections each followed by substantive text (2+ sentences in the next block).
${targets.requireStemAnalogy && !original.simpleExplanation?.analogy?.trim() ? '- ADD simpleExplanation.analogy: a concrete, memorable analogy for the core concept.' : ''}
- All LaTeX inside $...$ or $$...$$ MUST be valid KaTeX. Escape % as \\\\%.
- Keep topicCode, slug, paper fields unchanged.
- Return the FULL improved lesson as a single JSON object (same schema as input).

Original lesson JSON:
${JSON.stringify(original, null, 2)}`
}

const MAX_IMPROVE_ATTEMPTS = 3

function parseImproveDraft(
  rawText: string,
  original: CourseLesson,
  subjectCode: string,
  relPath: string
): CourseLesson | { error: string } {
  const parsed = extractJSON(rawText) as Record<string, unknown>
  const originalRec = original as unknown as Record<string, unknown>
  const sanitized = sanitizeRawLesson(
    enrichLegacyLessonFields(
      {
        ...originalRec,
        ...parsed,
        slug: original.slug,
        topicCode: original.topicCode,
        status: original.status,
      },
      subjectCode,
      relPath
    )
  )

  try {
    const draft = PublishedLessonVerifySchema.parse(sanitized) as CourseLesson
    return sanitizeLessonKatex(draft)
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function improveLessonFile(opts: {
  absPath: string
  relPath: string
  subjectCode: string
  writer: ReturnType<typeof createGuardedWriter>
  promoteIfBetter: boolean
}): Promise<{
  relPath: string
  action: 'promoted' | 'draft_only' | 'rejected' | 'skipped'
  reasons: string[]
}> {
  let original: CourseLesson
  try {
    original = JSON.parse(fs.readFileSync(opts.absPath, 'utf8')) as CourseLesson
  } catch {
    return { relPath: opts.relPath, action: 'skipped', reasons: ['json_parse'] }
  }

  if (original.status !== 'premium' && original.status !== 'published') {
    return { relPath: opts.relPath, action: 'skipped', reasons: ['not_published'] }
  }

  const baseline = measureLesson(original, opts.relPath, opts.subjectCode)
  if (baseline.passed) {
    return { relPath: opts.relPath, action: 'skipped', reasons: ['already_passes'] }
  }

  const nonRegenFailures = baseline.errorCodes.filter((c) => !REGENERATION_FIXABLE_CODES.has(c))
  if (nonRegenFailures.length) {
    return {
      relPath: opts.relPath,
      action: 'skipped',
      reasons: [`not_regeneration_eligible: ${nonRegenFailures.join(', ')}`],
    }
  }

  let draft: CourseLesson | null = null
  let lastParseError: string | null = null
  let katexFeedback: string[] = []

  for (let attempt = 1; attempt <= MAX_IMPROVE_ATTEMPTS; attempt++) {
    const rawText = await generateGeminiText(
      buildImprovePrompt(original, baseline, opts.subjectCode, { katexFeedback }),
      {
        task: 'content-generation',
        temperature: 0.35,
        maxOutputTokens: 65536,
      }
    )

    const parsed = parseImproveDraft(rawText, original, opts.subjectCode, opts.relPath)
    if ('error' in parsed) {
      lastParseError = parsed.error
      continue
    }

    const introduced = draftIntroducedKatexRegression(original, parsed)
    if (introduced.length) {
      katexFeedback = introduced.slice(0, 5)
      lastParseError = `katex_parse_error: ${introduced[0]}`
      continue
    }

    const remaining = lessonKatexErrors(parsed)
    if (remaining.length) {
      katexFeedback = remaining.slice(0, 5)
      lastParseError = `katex_parse_error: ${remaining[0]}`
      continue
    }

    draft = parsed
    break
  }

  if (!draft) {
    return {
      relPath: opts.relPath,
      action: 'rejected',
      reasons: [lastParseError ?? 'generation_failed'],
    }
  }

  const draftRel = improvePilotPath(opts.relPath)
  opts.writer.writeFile(draftRel, `${JSON.stringify(draft, null, 2)}\n`)

  const draftMetrics = measureLesson(draft, draftRel, opts.subjectCode)
  const gate = compareImprovementGate(baseline, draftMetrics)

  if (!gate.promote) {
    return { relPath: opts.relPath, action: 'rejected', reasons: gate.rejectReasons }
  }

  if (requiresHumanReviewBeforePublish(opts.subjectCode)) {
    return {
      relPath: opts.relPath,
      action: 'draft_only',
      reasons: ['review_required - draft saved, promotion blocked'],
    }
  }

  if (opts.promoteIfBetter) {
    opts.writer.writeFile(opts.relPath, `${JSON.stringify(draft, null, 2)}\n`)
    return { relPath: opts.relPath, action: 'promoted', reasons: gate.fixedCodes }
  }

  return { relPath: opts.relPath, action: 'draft_only', reasons: ['promote disabled'] }
}

export type LessonImproveBatchReport = {
  runAt: string
  processed: number
  promoted: number
  draftOnly: number
  rejected: number
  skipped: number
  log: Array<{ relPath: string; action: string; reasons: string[] }>
}

export async function runLessonImproveBatch(opts: {
  projectRoot?: string
  relPaths: string[]
  promoteIfBetter?: boolean
  limit?: number
}): Promise<LessonImproveBatchReport> {
  const projectRoot = opts.projectRoot ?? process.cwd()
  process.env.COURSE_AUTONOMY = '1'
  const writer = createGuardedWriter()
  const paths = opts.limit != null ? opts.relPaths.slice(0, opts.limit) : opts.relPaths

  const log: LessonImproveBatchReport['log'] = []
  let promoted = 0
  let draftOnly = 0
  let rejected = 0
  let skipped = 0

  for (const rel of paths) {
    const abs = path.join(projectRoot, rel)
    const subjectCode = rel.split('/')[2] ?? ''
    if (!subjectCode || !fs.existsSync(abs)) continue

    try {
      const result = await improveLessonFile({
        absPath: abs,
        relPath: rel,
        subjectCode,
        writer,
        promoteIfBetter: opts.promoteIfBetter ?? true,
      })
      log.push({ relPath: rel, action: result.action, reasons: result.reasons })
      if (result.action === 'promoted') promoted += 1
      else if (result.action === 'draft_only') draftOnly += 1
      else if (result.action === 'rejected') rejected += 1
      else skipped += 1
    } catch (err) {
      rejected += 1
      log.push({
        relPath: rel,
        action: 'rejected',
        reasons: [err instanceof Error ? err.message : String(err)],
      })
    }
  }

  return {
    runAt: new Date().toISOString(),
    processed: paths.length,
    promoted,
    draftOnly,
    rejected,
    skipped,
    log,
  }
}

export function rejectedRegenPathsFromBatchLog(
  batchLogPath: string,
  projectRoot?: string
): string[] {
  const root = projectRoot ?? process.cwd()
  const abs = path.isAbsolute(batchLogPath) ? batchLogPath : path.join(root, batchLogPath)
  const data = JSON.parse(fs.readFileSync(abs, 'utf8')) as {
    job3?: { log: Array<{ relPath: string; action: string }> }
  }
  if (!data.job3?.log) return []
  return data.job3.log
    .filter((e) => e.action === 'rejected')
    .map((e) => e.relPath)
}

export function failingLessonPathsFromAudit(
  auditReport: import('./weak-lesson-audit').WeakLessonAuditReport,
  opts: {
    excludeReviewRequired?: boolean
    excludeSubjectCodes?: string[]
    subjectCode?: string
  } = {}
): string[] {
  let paths = regenerationEligiblePathsFromAudit(auditReport, {
    subjectCode: opts.subjectCode,
  })
  if (opts.excludeReviewRequired) {
    paths = paths.filter((p) => {
      const subjectCode = p.split('/')[2] ?? ''
      return !requiresHumanReviewBeforePublish(subjectCode)
    })
  }
  if (opts.excludeSubjectCodes?.length) {
    const excluded = new Set(opts.excludeSubjectCodes)
    paths = paths.filter((p) => !excluded.has(p.split('/')[2] ?? ''))
  }
  return paths
}
