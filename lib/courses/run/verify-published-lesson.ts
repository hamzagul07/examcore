import { z } from 'zod'
import type { CourseLesson } from '@/lib/courses/types'
import { LessonSectionSchema } from '@/lib/courses/generator/lesson-schema'
import {
  getQualityTargets,
  qualityTierForStatus,
  type QualityTier,
} from '@/lib/courses/generator/quality-targets'
import { summarizeKatexValidation } from '@/lib/extraction/katex-validate'
import type { ValidationIssue } from '@/lib/courses/generator/validate-lesson'

export type PublishedLessonValidationResult = {
  ok: boolean
  issues: ValidationIssue[]
  filePath: string
  subjectCode: string
  topicCode: string | null
}

/** Published on-disk lessons ÿ generator-only fields optional (legacy content). */
export const PublishedLessonVerifySchema = z
  .object({
    slug: z.string().min(1),
    topicCode: z.string().min(1),
    title: z.string().min(1),
    paper: z.string().min(1),
    paperName: z.string().min(1),
    status: z.enum(['published', 'outline', 'premium', 'pilot']),
    summary: z.string().min(1),
    durationMin: z.number().int().positive(),
    sections: z.array(LessonSectionSchema).min(1),
    learningObjectives: z.array(z.string().min(1)).optional(),
    simpleExplanation: z
      .object({
        analogy: z.string().optional(),
        keyTakeaway: z.string().optional(),
      })
      .optional(),
    faq: z
      .array(z.object({ q: z.string().min(1), a: z.string().min(1) }))
      .optional(),
    flashcards: z
      .array(z.object({ front: z.string(), back: z.string() }))
      .optional(),
    paperNumber: z.coerce.string().optional(),
    paperType: z.enum(['mcq', 'practical', 'structured']).optional(),
    level: z.string().optional(),
    syllabusObjectivesCovered: z.array(z.string().min(1)).optional(),
    pastPaperReferences: z.array(z.unknown()).optional(),
    generatedAt: z.string().optional(),
    generatorVersion: z.string().optional(),
    quickCheck: z.array(z.unknown()).optional(),
    interactiveEmbed: z.unknown().optional(),
    diagram: z.object({ src: z.string(), alt: z.string() }).optional(),
    diagramSpec: z.unknown().optional(),
  })
  .passthrough()

function collectLessonText(lesson: CourseLesson): string {
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

function countHeadingTextPairs(lesson: CourseLesson): number {
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

function validateKatex(lesson: CourseLesson): ValidationIssue[] {
  const text = collectLessonText(lesson)
  const summary = summarizeKatexValidation(text)
  if (summary.allParseable) return []
  return summary.failedFragments.map((f) => ({
    code: 'katex_parse_error',
    message: `Unparseable KaTeX: ${f.fragment.slice(0, 60)} ÿ ${f.error}`,
    severity: 'error' as const,
  }))
}

function validateWorkedExamples(lesson: CourseLesson): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const worked = lesson.sections.filter((s) => s.type === 'workedExample')
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  for (const [i, ex] of worked.entries()) {
    if (ex.type !== 'workedExample') continue
    if (ex.sourceQuestionId && !uuidRe.test(ex.sourceQuestionId)) {
      issues.push({
        code: 'invalid_source_question_id',
        message: `workedExample ${i + 1} sourceQuestionId is not a valid UUID`,
        severity: 'error',
      })
    }
    if (!ex.question.trim() || !ex.solution.trim()) {
      issues.push({
        code: 'empty_worked_example',
        message: `workedExample ${i + 1} has empty question or solution`,
        severity: 'error',
      })
    }
  }
  return issues
}

function validateQualityTargets(
  lesson: CourseLesson,
  subjectCode: string,
  tier: QualityTier
): ValidationIssue[] {
  const targets = getQualityTargets(subjectCode, tier)
  const issues: ValidationIssue[] = []
  const worked = lesson.sections.filter((s) => s.type === 'workedExample')

  if (worked.length < targets.minWorkedExamples) {
    issues.push({
      code: 'min_worked_examples',
      message: `Need ?${targets.minWorkedExamples} workedExample sections (found ${worked.length})`,
      severity: 'error',
    })
  }

  const flashcardCount = lesson.flashcards?.length ?? 0
  if (flashcardCount < targets.minFlashcards) {
    issues.push({
      code: 'min_flashcards',
      message: `Need ?${targets.minFlashcards} flashcards (found ${flashcardCount})`,
      severity: tier === 'pilot' ? 'warning' : 'error',
    })
  }

  if (targets.requireStemAnalogy && !lesson.simpleExplanation?.analogy?.trim()) {
    issues.push({
      code: 'missing_analogy',
      message: 'STEM abstract topics require simpleExplanation.analogy',
      severity: tier === 'pilot' ? 'warning' : 'error',
    })
  }

  const headingPairs = countHeadingTextPairs(lesson)
  if (headingPairs < targets.minHeadingGroups) {
    issues.push({
      code: 'min_heading_groups',
      message: `Need ?${targets.minHeadingGroups} heading groups with substantive body text (found ${headingPairs})`,
      severity: tier === 'pilot' ? 'warning' : 'error',
    })
  }

  const visualCount =
    (lesson.interactiveEmbed ? 1 : 0) +
    (lesson.diagramSpec ? 1 : 0) +
    (lesson.diagram ? 1 : 0)

  if (visualCount > targets.maxPrimaryVisuals) {
    issues.push({
      code: 'multiple_visuals',
      message: `At most ${targets.maxPrimaryVisuals} primary visual allowed (found ${visualCount})`,
      severity: 'error',
    })
  }

  return issues
}

export function verifyPublishedLessonJson(
  lesson: unknown,
  filePath: string,
  subjectCode: string,
  opts: { strict?: boolean } = {}
): PublishedLessonValidationResult {
  const issues: ValidationIssue[] = []

  let parsed: CourseLesson
  try {
    parsed = PublishedLessonVerifySchema.parse(lesson) as CourseLesson
  } catch (err) {
    return {
      ok: false,
      filePath,
      subjectCode,
      topicCode: null,
      issues: [
        {
          code: 'schema_invalid',
          message: err instanceof Error ? err.message : String(err),
          severity: 'error',
        },
      ],
    }
  }

  if (parsed.topicCode !== parsed.topicCode.trim()) {
    issues.push({
      code: 'topic_code',
      message: 'topicCode is required',
      severity: 'error',
    })
  }

  issues.push(...validateKatex(parsed))
  issues.push(...validateWorkedExamples(parsed))

  const tier = qualityTierForStatus(parsed.status)
  if (opts.strict) {
    issues.push(...validateQualityTargets(parsed, subjectCode, tier))
  }

  const hasErrors = issues.some((i) => i.severity === 'error')
  return {
    ok: !hasErrors,
    issues,
    filePath,
    subjectCode,
    topicCode: parsed.topicCode,
  }
}

export function formatVerificationFailures(
  results: PublishedLessonValidationResult[]
): string {
  const failed = results.filter((r) => !r.ok)
  if (!failed.length) return ''
  return failed
    .map((r) => {
      const issueLines = r.issues
        .filter((i) => i.severity === 'error')
        .map((i) => `    [${i.code}] ${i.message}`)
        .join('\n')
      return `${r.filePath}\n${issueLines}`
    })
    .join('\n\n')
}
