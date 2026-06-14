import { generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import type { CourseLesson } from '@/lib/courses/types'
import { hydrateLessonCatalogVisuals } from '@/lib/courses/attach-lesson-visuals'
import { getLessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { INTERACTIVE_EMBED_CATALOG } from '@/lib/courses/interactive-embeds'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { buildVisualAuthoringGuide } from '@/lib/courses/visual-catalog'
import type { SyllabusTopic } from '@/lib/syllabi'
import { assertDeepLesson } from '@/lib/courses/stem-deep-quality'
import { syncLessonStepsToCatalog } from '@/lib/courses/sync-steps-to-catalog'
import type { StemDeepSpec } from '@/lib/courses/stem-deep-spec'

export type GenerateStemDeepParams = {
  subjectCode: string
  subjectName: string
  topic: SyllabusTopic
}

function catalogContext(slug: string): string {
  const embed = INTERACTIVE_EMBED_CATALOG[slug]
  const spec = getLessonDiagramSpec(slug)
  const lines: string[] = []
  if (embed) {
    lines.push(`Live embed: ${embed.title} (${embed.provider}) — ${embed.hint}`)
  }
  if (spec?.steps.length) {
    lines.push('Step-sync beats (use as simpleExplanation.steps):')
    for (const [i, s] of spec.steps.slice(0, 4).entries()) {
      lines.push(`  ${i + 1}. ${s.caption ?? ''} | Sim hint: ${s.embedHint ?? ''}`)
    }
  }
  return lines.length ? lines.join('\n') : 'No curated live visual — still write 4 exam-focused steps.'
}

function buildSystemPrompt(subjectCode: string, subjectName: string): string {
  return `You are an expert Cambridge International A-Level ${subjectName} (${subjectCode}) lesson author.

Write ORIGINAL teaching content — British English, ages 16–18, exam-aligned. Do NOT copy third-party notes.

Output ONLY valid JSON matching this shape:
{
  "summary": "string",
  "durationMin": 22,
  "learningObjectives": ["3-4 strings"],
  "simpleExplanation": {
    "title": "engaging short title",
    "summary": "2 sentences",
    "analogy": "concrete everyday analogy BEFORE formalism",
    "steps": ["exactly 4 strings aligned to live sim steps when provided"]
  },
  "flashcards": [{ "front": "...", "back": "..." }],
  "sections": [
    { "type": "intro", "content": "..." },
    { "type": "heading", "content": "..." },
    { "type": "text", "content": "..." },
    { "type": "formula", "content": "..." },
    { "type": "keyPoints", "items": ["..."] },
    { "type": "workedExample", "question": "...", "solution": "..." },
    { "type": "examTip", "content": "..." },
    { "type": "practice", "label": "...", "href": "/mark?subject=CODE&topic=TOPIC" },
    { "type": "resources", "items": [{ "label": "...", "href": "..." }] }
  ],
  "faq": [{ "q": "...", "a": "..." }]
}

Rules:
- ≥10 flashcards with TOPIC-SPECIFIC definitions and traps (NOT "which paper tests this").
- ≥2 workedExample sections with REAL numbers, units, and mark-scheme working.
- ≥3 heading sections each followed by text, formula, or keyPoints (≥2 sentences in text).
- Section types ONLY: intro, heading, text, formula, keyPoints, examTip, workedExample, practice, resources.
- KaTeX inline $...$ where needed. Escape backslashes in JSON.
- End with practice + resources sections.`
}

function buildUserPrompt(params: GenerateStemDeepParams, slug: string): string {
  const { subjectCode, topic } = params
  return `Topic: ${topic.code} — ${topic.name}
Paper: ${topic.paper} (${topic.paperName})
Slug: ${slug}

${buildVisualAuthoringGuide(slug)}

${catalogContext(slug)}

Write deep pilot lesson JSON. simpleExplanation.steps MUST match the 4 catalog beats when listed above.
practice href: /mark?subject=${subjectCode}&topic=${encodeURIComponent(topic.code)}`
}

function parseDeepSpec(raw: Record<string, unknown>): StemDeepSpec {
  const se = raw.simpleExplanation as StemDeepSpec['simpleExplanation']
  if (!se?.steps || se.steps.length !== 4) {
    throw new Error('simpleExplanation must have exactly 4 steps')
  }
  const sections = raw.sections as CourseLesson['sections']
  const worked = sections.filter((s) => s.type === 'workedExample')
  if (worked.length < 2) throw new Error('need ≥2 workedExample sections')
  const flashcards = raw.flashcards as StemDeepSpec['flashcards']
  if (!flashcards || flashcards.length < 10) throw new Error('need ≥10 flashcards')

  return {
    summary: String(raw.summary ?? ''),
    durationMin: Number(raw.durationMin ?? 22),
    learningObjectives: raw.learningObjectives as string[],
    simpleExplanation: se,
    flashcards,
    sections,
    faq: raw.faq as StemDeepSpec['faq'],
  }
}

export function deepSpecToLesson(
  params: GenerateStemDeepParams,
  spec: StemDeepSpec
): CourseLesson {
  const { subjectCode, topic } = params
  const slug = topicToLessonSlug(topic.code, topic.name)
  return {
    slug,
    topicCode: topic.code,
    title: topic.name,
    paper: topic.paper,
    paperName: topic.paperName,
    status: 'pilot',
    summary: spec.summary,
    durationMin: spec.durationMin ?? 22,
    updated: new Date().toISOString().slice(0, 10),
    learningObjectives: spec.learningObjectives,
    simpleExplanation: spec.simpleExplanation,
    flashcards: spec.flashcards,
    faq: spec.faq,
    sections: spec.sections,
    generatorVersion: 'stem-deep-author-1',
  }
}

export async function generateStemDeepLesson(
  params: GenerateStemDeepParams,
  opts: { maxRetries?: number } = {}
): Promise<{ lesson: CourseLesson; issues: string[] }> {
  const slug = topicToLessonSlug(params.topic.code, params.topic.name)
  const maxRetries = opts.maxRetries ?? 3
  let lastErr = 'unknown'

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const rawText = await generateGeminiText(buildUserPrompt(params, slug), {
        task: 'content-generation',
        system: buildSystemPrompt(params.subjectCode, params.subjectName),
        temperature: 0.35,
        maxOutputTokens: 65536,
      })
      const parsed = extractJSON(rawText) as Record<string, unknown>
      const spec = parseDeepSpec(parsed)
      let lesson = deepSpecToLesson(params, spec)
      lesson = syncLessonStepsToCatalog(lesson)
      lesson = hydrateLessonCatalogVisuals(lesson)
      const issues = assertDeepLesson(lesson)
      if (issues.length) {
        lastErr = issues.join('; ')
        continue
      }
      return { lesson, issues: [] }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(`Deep lesson failed after ${maxRetries} attempts: ${lastErr}`)
}
