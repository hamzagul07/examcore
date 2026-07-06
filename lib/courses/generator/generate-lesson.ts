import fs from 'fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import { getLessonEvidence } from '@/lib/courses/content-source'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { getSyllabusByCode } from '@/lib/syllabi'
import { pilotLessonDir, pilotLessonPath } from '@/lib/courses/paths'
import type { PastPaperQuestionRef } from '@/lib/courses/types'
import { GENERATOR_VERSION, MAX_GENERATION_RETRIES } from './constants'
import {
  buildLessonSystemPrompt,
  buildLessonUserPrompt,
  type LessonPromptContext,
} from './lesson-prompt'
import {
  GeneratedLessonSchema,
  type GeneratedLesson,
} from './lesson-schema'
import { fetchDiagramsByQuestionIds } from '@/lib/courses/content-source-diagrams'
import { stripImgTags } from '@/lib/courses/worked-example-text'
import { createAdminClient } from '@/lib/supabase-admin'
import { sanitizeRawLesson } from './sanitize-raw-lesson'
import { postProcessGeneratedLesson } from './lesson-post-process'
import { validateGeneratedLesson, type LessonValidationResult } from './validate-lesson'

export type GenerateLessonParams = {
  subjectCode: string
  paperNumber: string
  topicCode: string
  supabase?: SupabaseClient
  /** Write .pilot.json sibling (default true) */
  persist?: boolean
  skipAnswerabilityLlm?: boolean
}

export type GenerateLessonResult = {
  lesson: GeneratedLesson
  validation: LessonValidationResult
  outputPath: string | null
  attempts: number
}

function resolveTopicTitle(subjectCode: string, topicCode: string, fallback: string): string {
  const topics = getSyllabusByCode(subjectCode) ?? []
  const leaf = topics.find((t) => t.code === topicCode)
  return leaf?.name ?? fallback
}

function synthesizeWorkedExamples(
  lesson: GeneratedLesson,
  evidence: Awaited<ReturnType<typeof getLessonEvidence>>,
  max = 3
): GeneratedLesson {
  const existing = lesson.sections.filter((s) => s.type === 'workedExample')
  if (existing.length) return lesson

  const marksByQuestion = new Map<string, string[]>()
  for (const m of evidence.markSchemes) {
    const list = marksByQuestion.get(m.question_id) ?? []
    list.push(m.point_text)
    marksByQuestion.set(m.question_id, list)
  }

  const synthesized = evidence.questions.slice(0, max).map((q) => {
    const points = marksByQuestion.get(q.id) ?? []
    const solution =
      points.length > 0
        ? points.map((p, i) => `${i + 1}. ${p}`).join('\n')
        : 'Refer to the published mark scheme for this question.'
    return {
      type: 'workedExample' as const,
      question: stripImgTags(q.question_text),
      solution,
      sourceQuestionId: q.id,
    }
  })

  if (!synthesized.length) return lesson

  return {
    ...lesson,
    sections: [...lesson.sections, ...synthesized],
  }
}

function objectiveLead(text: string): string {
  return text.split('\n')[0].replace(/^[-•]\s*/, '').trim()
}

/** When no tagged past-paper questions exist, add exam-style numeric worked examples. */
function ensureAuthorWorkedExamples(
  lesson: GeneratedLesson,
  ctx: LessonPromptContext,
  evidence: Awaited<ReturnType<typeof getLessonEvidence>>
): GeneratedLesson {
  const existing = lesson.sections.filter((s) => s.type === 'workedExample')
  if (existing.length > 0 || evidence.questions.length > 0) return lesson
  if (!evidence.objectives.length) return lesson

  let workedExample: {
    type: 'workedExample'
    question: string
    solution: string
  }

  if (ctx.subjectCode === '9706') {
    if (ctx.topicCode.startsWith('3.1.2')) {
      workedExample = {
        type: 'workedExample',
        question:
          'A and B are partners sharing profits 3:2. Goodwill is valued at $60,000 on the admission of C, who receives a 1/5 share. C introduces capital of $40,000 cash.\n\n**Prepare** the journal entries for goodwill and capital.',
        solution:
          '**Goodwill (memorandum revaluation):**\nDr Goodwill $60,000\nCr A Capital $36,000 (3/5)\nCr B Capital $24,000 (2/5)\n\nDr A Capital $36,000, B Capital $24,000, C Capital $12,000\nCr Goodwill $72,000 (written off in new ratio 3:2:1 after admission)\n\n**Capital introduced:**\nDr Bank $40,000\nCr C Capital $40,000\n\n**Net effect:** A gains $0 on goodwill write-off (36k cr − 36k dr); B gains $0; C charged $12,000 for goodwill share.',
      }
    } else if (ctx.topicCode.startsWith('3.1.3')) {
      workedExample = {
        type: 'workedExample',
        question:
          'A sports club had subscriptions of $24,000 received during the year. At 1 Jan, $800 was owed by members; at 31 Dec, $1,200 was owed. Subscriptions of $600 related to the next year were received in advance.\n\n**Calculate** the subscriptions figure for the Income and Expenditure Account.',
        solution:
          '**Accrual basis adjustment:**\nCash received $24,000\nAdd: opening accrual (owed at start) $800\nLess: closing accrual (still owed) ($1,200)\nLess: income in advance ($600)\n\n**Subscriptions for I&E Account = $23,000**',
      }
    } else {
      workedExample = {
        type: 'workedExample',
        question:
          'The directors of Z plc review the Statement of Cash Flows for the year. Net cash from operating activities was $420,000; investing outflows $180,000; dividends paid $95,000.\n\n**Explain** why the Statement of Cash Flows is essential for assessing liquidity.',
        solution:
          'Profit per the SoPL can include non-cash items (depreciation, accruals). The SoCF shows **actual cash** generated ($420,000 from operations), whether the firm can fund investments ($180,000) and dividends ($95,000) without external borrowing, and highlights liquidity risk even when reported profit is higher.',
      }
    }
  } else {
    const lead = objectiveLead(evidence.objectives[0]?.objective_text ?? ctx.topicTitle)
    workedExample = {
      type: 'workedExample',
      question: `${ctx.topicTitle} (${ctx.topicCode}): a typical ${ctx.subjectCode} Paper ${ctx.paperNumber} calculation on ${lead.slice(0, 80)}.`,
      solution:
        '**Method:**\n1. State known values and the formula.\n2. Substitute and show working with units.\n3. State the final answer clearly.\n\n*(Replace with paper-specific figures when past-paper evidence is linked.)*',
    }
  }

  return {
    ...lesson,
    sections: [...lesson.sections, workedExample],
  }
}

function buildPastPaperRefs(
  lesson: GeneratedLesson,
  evidence: Awaited<ReturnType<typeof getLessonEvidence>>
): PastPaperQuestionRef[] {
  const byId = new Map(evidence.questions.map((q) => [q.id, q]))
  const refs: PastPaperQuestionRef[] = []

  for (const s of lesson.sections) {
    if (s.type !== 'workedExample' || !s.sourceQuestionId) continue
    const q = byId.get(s.sourceQuestionId)
    if (!q) continue
    const paperCode = `${q.subject_code}/${q.variant}`
    refs.push({
      paperCode,
      paperSession: `${q.year}-${q.session.replace(/\s+/g, '-')}`,
      sessionLabel: `${q.session} ${q.year}`,
      questionNumber: q.question_number,
      questionText: q.question_text.slice(0, 500),
      totalMarks: q.marks ?? 1,
      markHref: `/marking/${paperCode}/${q.year}-${q.session.replace(/\s+/g, '-')}/${q.question_number}`,
    })
  }

  return refs
}

function enrichGeneratedLesson(
  raw: GeneratedLesson,
  ctx: LessonPromptContext,
  evidence: Awaited<ReturnType<typeof getLessonEvidence>>
): GeneratedLesson {
  const now = new Date().toISOString()

  const withEvidenceExamples = synthesizeWorkedExamples(
    {
      ...raw,
      slug: ctx.slug,
      topicCode: ctx.topicCode,
      title: raw.title || ctx.topicTitle,
      paper: `P${ctx.paperNumber}`,
      paperName: ctx.paperDisplayName,
      paperNumber: ctx.paperNumber,
      paperType: ctx.paperKind,
      level: 'A-Level',
      status: 'pilot',
      generatedAt: now,
      generatorVersion: GENERATOR_VERSION,
      pastPaperReferences: undefined,
      syllabusObjectivesCovered:
        raw.syllabusObjectivesCovered?.length
          ? raw.syllabusObjectivesCovered
          : evidence.objectives.map((o) => o.objective_number),
      durationMin:
        typeof raw.durationMin === 'number' && raw.durationMin > 0 ? raw.durationMin : 25,
      summary:
        raw.summary?.length >= 20
          ? raw.summary
          : `Cambridge ${ctx.subjectCode} Paper ${ctx.paperNumber} lesson on ${ctx.topicTitle}.`,
    },
    evidence
  )

  const enriched = ensureAuthorWorkedExamples(withEvidenceExamples, ctx, evidence)

  const refs = buildPastPaperRefs(enriched, evidence)

  return {
    ...enriched,
    slug: ctx.slug,
    pastPaperReferences: refs.length ? refs : undefined,
  }
}

function formatValidationFeedback(validation: LessonValidationResult): string {
  return validation.issues
    .filter((i) => i.severity === 'error')
    .map((i) => `- [${i.code}] ${i.message}`)
    .join('\n')
}

export async function generateLesson(
  params: GenerateLessonParams
): Promise<GenerateLessonResult> {
  const {
    subjectCode,
    paperNumber,
    topicCode,
    persist = true,
    skipAnswerabilityLlm = false,
  } = params

  const supabase = params.supabase ?? createAdminClient()
  const evidence = await getLessonEvidence(subjectCode, paperNumber, topicCode, {
    supabase,
  })

  if (!evidence.objectives.length) {
    throw new Error(`No syllabus objectives for ${subjectCode} P${paperNumber} topic ${topicCode}`)
  }

  const topicTitle = resolveTopicTitle(
    subjectCode,
    topicCode,
    evidence.objectives[0]?.topic_title ?? topicCode
  )
  const slug = topicToLessonSlug(topicCode, topicTitle)
  const syllabusTopic = getSyllabusByCode(subjectCode)?.find((t) => t.code === topicCode)

  const ctx: LessonPromptContext = {
    subjectCode,
    paperNumber,
    topicCode,
    topicTitle,
    slug,
    paperKind: evidence.paper.paperKind,
    paperDisplayName: syllabusTopic?.paperName ?? evidence.paper.displayName,
  }

  const system = buildLessonSystemPrompt(ctx)
  let lastValidation: LessonValidationResult | null = null
  let lesson: GeneratedLesson | null = null
  let attempts = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES; attempt++) {
    attempts = attempt
    const retryNote =
      lastValidation && !lastValidation.ok
        ? `\n\nPrevious attempt failed validation. Fix these errors:\n${formatValidationFeedback(lastValidation)}`
        : ''

    const user = buildLessonUserPrompt(ctx, evidence) + retryNote
    const rawText = await generateGeminiText(user, {
      task: 'content-generation',
      system,
      temperature: 0.4,
      maxOutputTokens: 65536,
    })

    const parsed = extractJSON(rawText) as Record<string, unknown>
    const sanitized = sanitizeRawLesson(parsed)
    const withDefaults = {
      title: ctx.topicTitle,
      summary: `Cambridge ${ctx.subjectCode} Paper ${ctx.paperNumber} revision: ${ctx.topicTitle}.`,
      durationMin: 25,
      status: 'pilot' as const,
      slug: ctx.slug,
      topicCode: ctx.topicCode,
      paper: `P${ctx.paperNumber}`,
      paperName: ctx.paperDisplayName,
      paperNumber: ctx.paperNumber,
      paperType: ctx.paperKind,
      level: 'A-Level',
      syllabusObjectivesCovered: evidence.objectives.map((o) => o.objective_number),
      ...sanitized,
    }
    let draft: GeneratedLesson
    try {
      draft = enrichGeneratedLesson(
        GeneratedLessonSchema.parse(withDefaults) as GeneratedLesson,
        ctx,
        evidence
      )
      GeneratedLessonSchema.parse(draft)
    } catch (zodErr) {
      lastValidation = {
        ok: false,
        issues: [
          {
            code: 'zod_parse',
            message: zodErr instanceof Error ? zodErr.message : String(zodErr),
            severity: 'error',
          },
        ],
        coverageScore: 0,
        answerabilityScore: null,
      }
      continue
    }

    const validation = await validateGeneratedLesson(draft, evidence, {
      skipAnswerabilityLlm: skipAnswerabilityLlm,
    })
    lastValidation = validation

    if (validation.ok) {
      lesson = draft
      break
    }
  }

  if (lesson) {
    const workedIds = lesson.sections
      .filter((s) => s.type === 'workedExample' && s.sourceQuestionId)
      .map((s) => (s.type === 'workedExample' ? s.sourceQuestionId! : ''))
    const diagramsByQuestion = await fetchDiagramsByQuestionIds(supabase, workedIds)
    lesson = postProcessGeneratedLesson(lesson, evidence, subjectCode, diagramsByQuestion)
    lesson = {
      ...lesson,
      generatorVersion: GENERATOR_VERSION,
      generatedAt: new Date().toISOString(),
    }
  }

  if (!lesson || !lastValidation) {
    throw new Error(
      `Lesson generation failed after ${attempts} attempts: ${lastValidation?.issues.map((i) => i.message).join('; ') ?? 'unknown'}`
    )
  }

  let outputPath: string | null = null
  if (persist) {
    const dir = pilotLessonDir(subjectCode, paperNumber)
    fs.mkdirSync(dir, { recursive: true })
    outputPath = pilotLessonPath(subjectCode, paperNumber, slug)
    fs.writeFileSync(outputPath, JSON.stringify(lesson, null, 2))
  }

  return {
    lesson,
    validation: lastValidation,
    outputPath,
    attempts,
  }
}
