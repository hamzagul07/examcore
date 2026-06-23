import { generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import type { CourseLesson } from '@/lib/courses/types'
import { hydrateLessonCatalogVisuals } from '@/lib/courses/attach-lesson-visuals'
import { topicToLessonSlug } from '@/lib/courses/slug'
import { syncLessonStepsToCatalog } from '@/lib/courses/sync-steps-to-catalog'
import type { SyllabusTopic } from '@/lib/syllabi'
import type { StemDeepSpec } from '@/lib/courses/stem-deep-spec'
import { deepSpecToLesson, type GenerateStemDeepParams } from '@/lib/courses/generate-stem-deep-lesson'
import { assertHumanitiesLesson } from '@/lib/courses/ib-humanities-quality'
import { formatLegitResourcesForPrompt } from '@/lib/ib/legitimate-resources'

export type GenerateIbHumanitiesParams = GenerateStemDeepParams

function buildHumanitiesSystemPrompt(
  subjectCode: string,
  subjectName: string,
  boardLabel = 'IB Diploma',
  markingConvention = 'IB markbands and assessment criteria'
): string {
  return `You are an expert ${boardLabel} ${subjectName} (${subjectCode}) lesson author.

Write ORIGINAL, in-depth teaching content for TOK, Extended Essay, CAS, Group 6 arts, English A, or Language B subjects.
British English, ages 16–18. Align with ${markingConvention} and the structure of IBO specimen/sample assessments (ibo.org specimen papers) — criterion descriptors, command terms, and authentic IB assessment language.

Do NOT copy third-party notes, paywalled sites, or unofficial paper repositories. Author fresh explanations grounded in the official IB subject guide topic structure and specimen marking conventions.

Output ONLY valid JSON matching this shape:
{
  "summary": "string",
  "durationMin": 25,
  "learningObjectives": ["4-5 strings"],
  "simpleExplanation": {
    "title": "engaging short title",
    "summary": "2-3 sentences",
    "analogy": "concrete analogy before formalism",
    "steps": ["exactly 4 exam-focused process steps"]
  },
  "flashcards": [{ "front": "...", "back": "..." }],
  "sections": [
    { "type": "intro", "content": "..." },
    { "type": "heading", "content": "..." },
    { "type": "text", "content": "..." },
    { "type": "keyPoints", "items": ["..."] },
    { "type": "workedExample", "question": "sample prompt or task", "solution": "model analysis with criterion language" },
    { "type": "examTip", "content": "..." },
    { "type": "practice", "label": "...", "href": "/mark?subject=CODE&topic=TOPIC" },
    { "type": "resources", "items": [{ "label": "...", "href": "..." }] }
  ],
  "faq": [{ "q": "...", "a": "..." }]
}

Rules:
- ≥12 flashcards — criterion terms, traps, and subject-specific vocabulary.
- ≥2 workedExample sections: model IB-style responses (essay paragraphs, exhibition commentary, comparative analysis, reflection — NOT numeric calculation).
- ≥4 heading sections with substantive text/keyPoints underneath.
- For TOK: reference AOKs, WOKs, knowledge questions, and perspectives where relevant.
- For EE: reference criteria A–E and research skills.
- For arts: formal analysis vocabulary, comparative study structure, process portfolio language.
- For English A: literary/textual analysis, comparative essay structure, HL Essay inquiry, Individual Oral global issue.
- For Language B: theme vocabulary, productive writing formats, comprehension strategies, oral presentation.
- End with practice (link to /mark) and resources sections.`
}

function buildHumanitiesUserPrompt(params: GenerateIbHumanitiesParams, slug: string): string {
  const { subjectCode, topic } = params
  return `Topic: ${topic.code} — ${topic.name}
Component: ${topic.paper} (${topic.paperName})
Slug: ${slug}

Write a deep, expert-level lesson that would help a student outperform generic revision notes.
Include authentic IB assessment criteria language and what examiners reward at the top band.

Legitimate external resources to cite in the resources section (link these; do not copy their text):
${formatLegitResourcesForPrompt(subjectCode)}

practice href: /mark?subject=${subjectCode}&topic=${encodeURIComponent(topic.code)}`
}

function parseHumanitiesSpec(raw: Record<string, unknown>): StemDeepSpec {
  const se = raw.simpleExplanation as StemDeepSpec['simpleExplanation']
  if (!se?.steps || se.steps.length !== 4) {
    throw new Error('simpleExplanation must have exactly 4 steps')
  }
  const sections = raw.sections as CourseLesson['sections']
  const worked = sections.filter((s) => s.type === 'workedExample')
  if (worked.length < 1) throw new Error('need ≥1 workedExample / case study')
  const flashcards = raw.flashcards as StemDeepSpec['flashcards']
  if (!flashcards || flashcards.length < 10) throw new Error('need ≥10 flashcards')

  return {
    summary: String(raw.summary ?? ''),
    durationMin: Number(raw.durationMin ?? 25),
    learningObjectives: raw.learningObjectives as string[],
    simpleExplanation: se,
    flashcards,
    sections,
    faq: raw.faq as StemDeepSpec['faq'],
  }
}

export async function generateIbHumanitiesDeepLesson(
  params: GenerateIbHumanitiesParams,
  opts: { maxRetries?: number; status?: CourseLesson['status'] } = {}
): Promise<{ lesson: CourseLesson; issues: string[] }> {
  const slug = topicToLessonSlug(params.topic.code, params.topic.name)
  const maxRetries = opts.maxRetries ?? 3
  let lastErr = 'unknown'

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const rawText = await generateGeminiText(buildHumanitiesUserPrompt(params, slug), {
        task: 'content-generation',
        system: buildHumanitiesSystemPrompt(
          params.subjectCode,
          params.subjectName,
          params.boardLabel,
          params.markingConvention
        ),
        temperature: 0.4,
        maxOutputTokens: 65536,
      })
      const parsed = extractJSON(rawText) as Record<string, unknown>
      const spec = parseHumanitiesSpec(parsed)
      let lesson = deepSpecToLesson(params, spec, { status: opts.status })
      lesson = { ...lesson, generatorVersion: 'ib-humanities-deep-1' }
      lesson = syncLessonStepsToCatalog(lesson)
      lesson = hydrateLessonCatalogVisuals(lesson)
      const issues = assertHumanitiesLesson(lesson)
      if (issues.length) {
        lastErr = issues.join('; ')
        continue
      }
      return { lesson, issues: [] }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(`IB humanities lesson failed after ${maxRetries} attempts: ${lastErr}`)
}
