import { stripImgTags } from '@/lib/courses/worked-example-text'

const SECTION_TYPES = new Set([
  'intro',
  'heading',
  'text',
  'formula',
  'keyPoints',
  'examTip',
  'workedExample',
  'practice',
  'resources',
])

function normalizeSectionType(type: unknown): string | null {
  if (typeof type !== 'string') return null
  const key = type.replace(/[\s_-]/g, '').toLowerCase()
  const map: Record<string, string> = {
    intro: 'intro',
    heading: 'heading',
    text: 'text',
    formula: 'formula',
    keypoints: 'keyPoints',
    keypoint: 'keyPoints',
    examtip: 'examTip',
    workedexample: 'workedExample',
    example: 'workedExample',
    practice: 'practice',
    resources: 'resources',
  }
  const normalized = map[key]
  if (normalized) return normalized
  if (SECTION_TYPES.has(type)) return type
  return null
}

function asString(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return fallback
}

function sanitizeSections(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  const out: Record<string, unknown>[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const type = normalizeSectionType(rec.type)
    if (!type) {
      const content = asString(rec.content ?? rec.text ?? rec.body)
      if (content) out.push({ type: 'text', content })
      continue
    }

    switch (type) {
      case 'intro':
      case 'heading':
      case 'text':
      case 'formula':
      case 'examTip': {
        const content = asString(rec.content ?? rec.text ?? rec.body)
        if (content) out.push({ type, content })
        break
      }
      case 'keyPoints': {
        const items = Array.isArray(rec.items)
          ? rec.items.map((x) => asString(x)).filter(Boolean)
          : Array.isArray(rec.points)
            ? rec.points.map((x) => asString(x)).filter(Boolean)
            : []
        if (items.length) out.push({ type, items })
        break
      }
      case 'workedExample': {
        const question = asString(
          rec.question ?? rec.prompt ?? rec.stem ?? rec.problem ?? rec.title
        )
        const solution = asString(
          rec.solution ?? rec.answer ?? rec.working ?? rec.explanation ?? rec.model_answer
        )
        const sourceQuestionId = asString(rec.sourceQuestionId ?? rec.source_question_id)
        if (question && solution) {
          out.push({
            type,
            question,
            solution,
            ...(sourceQuestionId ? { sourceQuestionId } : {}),
          })
        }
        break
      }
      case 'practice': {
        const label = asString(rec.label ?? rec.title)
        const href = asString(rec.href ?? rec.url, '#')
        if (label) out.push({ type, label, href })
        break
      }
      case 'resources': {
        const items = Array.isArray(rec.items)
          ? rec.items
              .map((x) => {
                if (!x || typeof x !== 'object') return null
                const r = x as Record<string, unknown>
                const label = asString(r.label ?? r.title)
                const href = asString(r.href ?? r.url, '#')
                return label ? { label, href } : null
              })
              .filter(Boolean)
          : []
        if (items.length) out.push({ type, items })
        break
      }
    }
  }

  return out
}

function sanitizeFlashcards(raw: unknown): { front: string; back: string; pillLabel?: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { front: string; back: string; pillLabel?: string }[] = []
  for (const fc of raw) {
    if (!fc || typeof fc !== 'object') continue
    const rec = fc as Record<string, unknown>
    const front = asString(rec.front ?? rec.question ?? rec.term)
    const back = asString(rec.back ?? rec.answer ?? rec.definition)
    if (front && back) {
      out.push({
        front,
        back,
        ...(rec.pillLabel ? { pillLabel: asString(rec.pillLabel) } : {}),
      })
    }
  }
  return out
}

function sanitizeSimpleExplanation(
  raw: unknown
): { title: string; summary: string; analogy?: string; steps: string[] } | undefined {
  if (!raw) return undefined
  if (typeof raw === 'string') {
    return { title: 'Simple explanation', summary: raw, steps: [raw] }
  }
  if (typeof raw !== 'object') return undefined
  const rec = raw as Record<string, unknown>
  const title = asString(rec.title, 'Simple explanation')
  const summary = asString(rec.summary ?? rec.content)
  const steps = Array.isArray(rec.steps)
    ? rec.steps.map((s) => asString(s)).filter(Boolean)
    : []
  if (!summary && !steps.length) return undefined
  return {
    title,
    summary: summary || steps[0] || title,
    ...(rec.analogy ? { analogy: asString(rec.analogy) } : {}),
    steps: steps.length ? steps : [summary || title],
  }
}

function sanitizeQuickCheck(
  raw: unknown
): { prompt: string; answer: string; options?: string[] }[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: { prompt: string; answer: string; options?: string[] }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const prompt = asString(rec.prompt ?? rec.question)
    const answer = asString(rec.answer)
    const options = Array.isArray(rec.options)
      ? rec.options.map((o) => asString(o)).filter(Boolean)
      : undefined
    if (prompt && answer) out.push({ prompt, answer, ...(options?.length ? { options } : {}) })
  }
  return out.length ? out : undefined
}

function mergeWorkedExamplesIntoSections(
  sections: Record<string, unknown>[],
  raw: Record<string, unknown>
): Record<string, unknown>[] {
  const out = [...sections]
  const pools = [raw.workedExamples, raw.worked_examples, raw.examples]
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue
    for (const item of pool) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const question = asString(rec.question ?? rec.prompt ?? rec.stem)
      const solution = asString(rec.solution ?? rec.answer ?? rec.working)
      const sourceQuestionId = asString(rec.sourceQuestionId ?? rec.source_question_id)
      if (question && solution) {
        out.push({
          type: 'workedExample',
          question: stripImgTags(question),
          solution,
          ...(sourceQuestionId ? { sourceQuestionId } : {}),
        })
      }
    }
  }
  return out
}

function sanitizeFaq(
  raw: unknown
): { q: string; a: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: { q: string; a: string }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const q = asString(rec.q ?? rec.question)
    const a = asString(rec.a ?? rec.answer)
    if (q && a) out.push({ q, a })
  }
  return out.length ? out : undefined
}

/** Normalize messy LLM lesson JSON before Zod validation. */
export function sanitizeRawLesson(raw: Record<string, unknown>): Record<string, unknown> {
  let sections = sanitizeSections(raw.sections)
  sections = mergeWorkedExamplesIntoSections(sections, raw)
  const flashcards = sanitizeFlashcards(raw.flashcards)
  const simpleExplanation = sanitizeSimpleExplanation(raw.simpleExplanation)
  const quickCheck = sanitizeQuickCheck(raw.quickCheck)
  const faq = sanitizeFaq(raw.faq)

  const learningObjectives = Array.isArray(raw.learningObjectives)
    ? raw.learningObjectives.map((o) => asString(o)).filter(Boolean)
    : undefined

  const syllabusObjectivesCovered = Array.isArray(raw.syllabusObjectivesCovered)
    ? raw.syllabusObjectivesCovered.map((o) => asString(o)).filter(Boolean)
    : undefined

  const paperNumber =
    raw.paperNumber != null ? String(raw.paperNumber) : undefined

  return {
    ...raw,
    ...(paperNumber ? { paperNumber } : {}),
    sections,
    ...(flashcards.length ? { flashcards } : {}),
    ...(simpleExplanation ? { simpleExplanation } : {}),
    ...(quickCheck ? { quickCheck } : {}),
    ...(faq ? { faq } : {}),
    ...(learningObjectives?.length ? { learningObjectives } : {}),
    ...(syllabusObjectivesCovered?.length ? { syllabusObjectivesCovered } : {}),
    pastPaperReferences: undefined,
  }
}
