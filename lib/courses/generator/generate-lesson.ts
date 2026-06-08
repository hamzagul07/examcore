import fs from 'fs'
import path from 'path'
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

  const enriched = synthesizeWorkedExamples(
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

  const ctx: LessonPromptContext = {
    subjectCode,
    paperNumber,
    topicCode,
    topicTitle,
    slug,
    paperKind: evidence.paper.paperKind,
    paperDisplayName: evidence.paper.displayName,
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
