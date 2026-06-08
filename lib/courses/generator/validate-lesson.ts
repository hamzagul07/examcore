import { generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import { summarizeKatexValidation } from '@/lib/extraction/katex-validate'
import type { LessonEvidence } from '@/lib/courses/content-source.schema'
import type { GeneratedLesson } from './lesson-schema'

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

function validatePaperStyle(lesson: GeneratedLesson): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (lesson.paperType === 'mcq') {
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

  if (lesson.paperType === 'practical') {
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
    ...validateKatex(lesson),
    ...validatePaperStyle(lesson),
  ]

  const { issues: coverageIssues, score: coverageScore } = validateObjectiveCoverage(
    lesson,
    evidence
  )
  issues.push(...coverageIssues)

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
