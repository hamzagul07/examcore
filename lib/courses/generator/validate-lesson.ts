import { generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import { summarizeKatexValidation } from '@/lib/extraction/katex-validate'
import type { LessonEvidence } from '@/lib/courses/content-source.schema'
import type { GeneratedLesson } from './lesson-schema'
import {
  getQualityTargets,
  paperStyleHints,
} from './quality-targets'

export type ValidationIssue = {
  code: string
  message: string
  severity: 'error' | 'warning'
}

export type LessonValidationResult = {
  ok: boolean
  issues: ValidationIssue[]
  coverageScore: number
  answerabilityScore: number | null
}

function collectLessonText(lesson: GeneratedLesson): string {
  const parts: string[] = [lesson.summary, lesson.title]
  for (const s of lesson.sections) {
    if ('content' in s) parts.push(s.content)
    if (s.type === 'keyPoints') parts.push(...s.items)
    if (s.type === 'workedExample') {
      parts.push(s.question, s.solution)
    }
  }
  if (lesson.learningObjectives) parts.push(...lesson.learningObjectives)
  if (lesson.flashcards) {
    for (const fc of lesson.flashcards) parts.push(fc.front, fc.back)
  }
  return parts.join('\n')
}

function validatePaperScope(
  lesson: GeneratedLesson,
  paperNumber: string,
  topicCode: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (lesson.paperNumber !== paperNumber) {
    issues.push({
      code: 'paper_number_mismatch',
      message: `paperNumber ${lesson.paperNumber} !== expected ${paperNumber}`,
      severity: 'error',
    })
  }

  if (lesson.topicCode !== topicCode) {
    issues.push({
      code: 'topic_mismatch',
      message: `topicCode ${lesson.topicCode} !== expected ${topicCode}`,
      severity: 'error',
    })
  }

  if (!lesson.paper.match(new RegExp(`P${paperNumber}\\b`))) {
    issues.push({
      code: 'paper_field',
      message: `paper field "${lesson.paper}" should reference P${paperNumber} only`,
      severity: 'error',
    })
  }

  return issues
}

function validateWorkedExampleTraceability(
  lesson: GeneratedLesson,
  evidence: LessonEvidence
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const validIds = new Set(evidence.questions.map((q) => q.id))
  const worked = lesson.sections.filter((s) => s.type === 'workedExample')

  if (!worked.length) {
    issues.push({
      code: 'no_worked_examples',
      message: 'Lesson has no workedExample sections',
      severity: 'error',
    })
  }

  for (const [i, ex] of worked.entries()) {
    if (!ex.sourceQuestionId) {
      issues.push({
        code: 'missing_source_question_id',
        message: `workedExample ${i + 1} missing sourceQuestionId`,
        severity: 'error',
      })
    } else if (!validIds.has(ex.sourceQuestionId)) {
      issues.push({
        code: 'unknown_source_question_id',
        message: `workedExample ${i + 1} sourceQuestionId not in evidence`,
        severity: 'error',
      })
    }
  }

  return issues
}

function validateObjectiveCoverage(
  lesson: GeneratedLesson,
  evidence: LessonEvidence
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = []
  const expected = new Set(evidence.objectives.map((o) => o.objective_number))
  const covered = new Set(lesson.syllabusObjectivesCovered ?? [])

  for (const num of expected) {
    if (!covered.has(num)) {
      issues.push({
        code: 'objective_not_covered',
        message: `Objective ${num} not listed in syllabusObjectivesCovered`,
        severity: 'warning',
      })
    }
  }

  const text = collectLessonText(lesson).toLowerCase()
  let keywordHits = 0
  for (const obj of evidence.objectives) {
    const tokens = obj.objective_text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 4)
      .slice(0, 4)
    if (tokens.some((t) => text.includes(t))) keywordHits += 1
  }

  const score =
    expected.size === 0 ? 1 : Math.min(1, (covered.size / expected.size) * 0.5 + (keywordHits / expected.size) * 0.5)

  return { issues, score }
}

function validateKatex(lesson: GeneratedLesson): ValidationIssue[] {
  const text = collectLessonText(lesson)
  const summary = summarizeKatexValidation(text)
  if (summary.allParseable) return []

  return summary.failedFragments.map((f) => ({
    code: 'katex_parse_error',
    message: `Unparseable KaTeX: ${f.fragment.slice(0, 60)} — ${f.error}`,
    severity: 'error',
  }))
}

function countHeadingTextPairs(lesson: GeneratedLesson): number {
  const sections = lesson.sections
  let pairs = 0
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].type !== 'heading') continue
    const next = sections[i + 1]
    if (!next) continue
    if (next.type === 'text' || next.type === 'formula' || next.type === 'keyPoints') {
      const body =
        next.type === 'keyPoints'
          ? next.items.join(' ')
          : 'content' in next
            ? next.content
            : ''
      const sentences = body.split(/[.!?]+/).filter((s) => s.trim().length > 8)
      if (sentences.length >= 2) pairs += 1
    }
  }
  return pairs
}

function validateTeachingDepth(lesson: GeneratedLesson, subjectCode: string): ValidationIssue[] {
  const targets = getQualityTargets(subjectCode, 'premium')
  const issues: ValidationIssue[] = []
  const worked = lesson.sections.filter((s) => s.type === 'workedExample')

  if (worked.length < targets.minWorkedExamples) {
    issues.push({
      code: 'min_worked_examples',
      message: `Need ≥${targets.minWorkedExamples} workedExample sections (found ${worked.length})`,
      severity: 'error',
    })
  }

  const flashcardCount = lesson.flashcards?.length ?? 0
  if (flashcardCount < targets.minFlashcards) {
    issues.push({
      code: 'min_flashcards',
      message: `Need ≥${targets.minFlashcards} flashcards (found ${flashcardCount})`,
      severity: 'error',
    })
  }

  if (targets.requireStemAnalogy && !lesson.simpleExplanation?.analogy?.trim()) {
    issues.push({
      code: 'missing_analogy',
      message: 'STEM abstract topics require simpleExplanation.analogy',
      severity: 'error',
    })
  }

  const headingPairs = countHeadingTextPairs(lesson)
  if (headingPairs < targets.minHeadingGroups) {
    issues.push({
      code: 'min_heading_groups',
      message: `Need ≥${targets.minHeadingGroups} heading groups with substantive body text (found ${headingPairs})`,
      severity: 'error',
    })
  }

  return issues
}

function validateSingleVisual(lesson: GeneratedLesson, subjectCode: string): ValidationIssue[] {
  const targets = getQualityTargets(subjectCode, 'premium')
  const visualCount =
    (lesson.interactiveEmbed ? 1 : 0) +
    (lesson.diagramSpec ? 1 : 0) +
    (lesson.diagram ? 1 : 0)

  if (visualCount > targets.maxPrimaryVisuals) {
    return [
      {
        code: 'multiple_visuals',
        message: `At most ${targets.maxPrimaryVisuals} primary visual allowed (found ${visualCount})`,
        severity: 'error',
      },
    ]
  }
  return []
}

function validatePaperStyle(lesson: GeneratedLesson): ValidationIssue[] {
  const hints = paperStyleHints(lesson.paperType)
  const issues: ValidationIssue[] = []

  if (hints.requireMcqCheck) {
    const hasMcqCheck =
      (lesson.quickCheck?.some((q) => (q.options?.length ?? 0) >= 2) ?? false) ||
      (lesson.flashcards?.length ?? 0) >= 4
    if (!hasMcqCheck) {
      issues.push({
        code: 'mcq_style',
        message: 'Paper 1 lesson should include quickCheck with options or ≥4 flashcards',
        severity: 'warning',
      })
    }
  }

  if (hints.requirePracticalVocab) {
    const text = collectLessonText(lesson).toLowerCase()
    if (!/uncertaint|error|significant figure|gradient|graph/.test(text)) {
      issues.push({
        code: 'practical_style',
        message: 'Paper 3 lesson should mention uncertainty/error analysis vocabulary',
        severity: 'warning',
      })
    }
  }

  return issues
}

function buildAnswerabilityPrompt(lesson: GeneratedLesson, evidence: LessonEvidence): string {
  const worked = lesson.sections
    .filter((s) => s.type === 'workedExample')
    .map((s, i) => `Example ${i + 1} (source=${s.sourceQuestionId}):\nQ: ${s.question}\nA: ${s.solution}`)
    .join('\n\n')

  const refs = (lesson.pastPaperReferences ?? [])
    .map((r) => `- ${r.questionNumber}: ${r.questionText.slice(0, 200)}`)
    .join('\n')

  return `You are validating a Cambridge Physics lesson against real past-paper evidence.

Evidence question count: ${evidence.questions.length}
Past paper refs in lesson: ${lesson.pastPaperReferences?.length ?? 0}

Worked examples:
${worked || '(none)'}

Past paper references:
${refs || '(none)'}

Score answerability 0.0–1.0: could a student use this lesson to attempt the linked past-paper questions without hallucinated facts?

Respond JSON only: {"score": number, "issues": string[]}`
}

export async function checkAnswerability(
  lesson: GeneratedLesson,
  evidence: LessonEvidence,
  opts: { skipLlm?: boolean } = {}
): Promise<{ score: number | null; issues: ValidationIssue[] }> {
  if (opts.skipLlm || !evidence.questions.length) {
    return { score: null, issues: [] }
  }

  try {
    const raw = await generateGeminiText(buildAnswerabilityPrompt(lesson, evidence), {
      task: 'validation-coverage',
      temperature: 0,
      maxOutputTokens: 1024,
    })
    const parsed = extractJSON(raw) as { score?: number; issues?: string[] }
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : null
    const issues: ValidationIssue[] = (parsed.issues ?? []).map((msg) => ({
      code: 'answerability',
      message: msg,
      severity: 'warning' as const,
    }))
    if (score != null && score < 0.6) {
      issues.push({
        code: 'low_answerability',
        message: `Answerability score ${score.toFixed(2)} below 0.6`,
        severity: 'error',
      })
    }
    return { score, issues }
  } catch (err) {
    return {
      score: null,
      issues: [
        {
          code: 'answerability_check_failed',
          message: err instanceof Error ? err.message : String(err),
          severity: 'warning',
        },
      ],
    }
  }
}

export async function validateGeneratedLesson(
  lesson: GeneratedLesson,
  evidence: LessonEvidence,
  opts: { skipAnswerabilityLlm?: boolean } = {}
): Promise<LessonValidationResult> {
  const issues: ValidationIssue[] = [
    ...validatePaperScope(lesson, evidence.paperNumber, evidence.topicCode),
    ...validateWorkedExampleTraceability(lesson, evidence),
    ...validateTeachingDepth(lesson, evidence.subjectCode),
    ...validateSingleVisual(lesson, evidence.subjectCode),
    ...validateKatex(lesson),
    ...validatePaperStyle(lesson),
  ]

  const { issues: coverageIssues, score: coverageScore } = validateObjectiveCoverage(
    lesson,
    evidence
  )
  issues.push(...coverageIssues)

  const qualityTargets = getQualityTargets(evidence.subjectCode, 'premium')
  if (coverageScore < qualityTargets.minCoverageScore && evidence.objectives.length > 0) {
    issues.push({
      code: 'low_coverage',
      message: `Coverage score ${coverageScore.toFixed(2)} below ${qualityTargets.minCoverageScore}`,
      severity: 'error',
    })
  }

  const hasStructuralErrors = issues.some(
    (i) =>
      i.severity === 'error' &&
      !['low_answerability', 'answerability'].includes(i.code)
  )

  let answerabilityScore: number | null = null
  if (!hasStructuralErrors) {
    const { score, issues: answerIssues } = await checkAnswerability(
      lesson,
      evidence,
      { skipLlm: opts.skipAnswerabilityLlm }
    )
    answerabilityScore = score
    issues.push(...answerIssues)
  }

  const hasErrors = issues.some((i) => i.severity === 'error')
  return {
    ok: !hasErrors,
    issues,
    coverageScore,
    answerabilityScore,
  }
}
