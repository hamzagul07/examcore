import { createHash } from 'crypto'
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { extractJSON } from '@/lib/marking/json'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { GEMINI_FLASH_MODEL } from '@/lib/ai/gemini-models'
import { sessionCodeToName } from '@/lib/marking/session'
import {
  needsHumanReviewForConfidence,
  topicTagReviewThreshold,
} from './review-threshold'
import {
  AMBIGUOUS_CALIBRATION_QUESTION,
  buildBatchTopicTaggingPrompt,
  buildJsonRepairPrompt,
  buildTagAuditPrompt,
  buildTopicTaggingPrompt,
  type TaggingQuestionContext,
} from './topic-tagger-prompts'
import type { NewQuestionTopicTag, SyllabusObjective } from './types'

export const TAGGED_BY = 'gemini-2.5-flash' as const
export const MAX_TAGS_PER_QUESTION = 3
export const TAGGING_BATCH_SIZE = 8

const syllabusCache = new Map<string, SyllabusObjective[]>()
export const TAG_AUDIT_SAMPLE_SIZE = 30
export const TAG_ACCURACY_TARGET = 0.9

export type RawTopicTag = {
  objective_number: string
  confidence: number
}

export type ValidatedTopicTag = {
  objective_number: string
  objective_id: string
  topic_code: string
  confidence: number
  needs_human_review: boolean
}

export type TaggingQuestion = {
  id: string
  subject_code: string
  paper_number: string
  variant: string
  year: number
  session: string
  question_number: string
  question_text: string
  marks: number | null
  is_leaf: boolean
  paper_kind?: string
}

export type TagQuestionResult = {
  question_id: string
  question_number: string
  tags: ValidatedTopicTag[]
  rejected: RawTopicTag[]
  raw_response: string
  /** All retry/repair attempts exhausted with no valid tags. */
  tagging_failed?: boolean
  repair_attempted?: boolean
}

export type BulkTaggingResult = {
  subjectCode: string
  sessionCode: string
  paperFilter: string | null
  questionsProcessed: number
  questionsTagged: number
  totalTags: number
  lowConfidenceTags: number
  rejectedHallucinations: number
  failures: { question_id: string; question_number: string; error: string }[]
  results: TagQuestionResult[]
}

export type TagAuditSample = {
  question_id: string
  question_number: string
  paper_number: string
  question_text: string
  marks: number | null
  tags: ValidatedTopicTag[]
  primary_tag_correct: boolean
  secondary_tags_correct: boolean
  reason: string
}

export type TagAuditResult = {
  sampleSize: number
  samplingMethod: 'stratified' | 'random'
  perPaperCounts: Record<string, number>
  primaryAccuracy: number
  /** Among samples with 2+ tags, fraction where secondary tags are acceptable. */
  secondaryAccuracy: number | null
  secondarySampleSize: number
  meetsTarget: boolean
  samples: TagAuditSample[]
}

export type ConfidenceCalibrationResult = {
  tags: ValidatedTopicTag[]
  raw_response: string
  spreadObserved: boolean
  minConfidence: number | null
  maxConfidence: number | null
}

function deterministicObjectiveId(
  subjectCode: string,
  syllabusYear: number,
  objectiveNumber: string
): string {
  const hash = createHash('sha256')
    .update(`${subjectCode}:${syllabusYear}:${objectiveNumber}`)
    .digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

export function normalizeConfidence(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value))
  }
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n))
  }
  return null
}

export function parseBatchTaggingResponse(
  raw: string
): Map<number, RawTopicTag[]> {
  const out = new Map<number, RawTopicTag[]>()
  let parsed: unknown
  try {
    parsed = extractJSON(raw)
  } catch {
    return out
  }

  const rows = Array.isArray(parsed) ? parsed : []
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const questionIndex = Number(row.question_index)
    if (!Number.isFinite(questionIndex) || questionIndex < 1) continue
    const tags = Array.isArray(row.tags) ? row.tags : []
    const parsedTags: RawTopicTag[] = []
    for (const tag of tags) {
      if (!tag || typeof tag !== 'object') continue
      const t = tag as Record<string, unknown>
      const objective_number = String(t.objective_number ?? '').trim()
      const confidence = normalizeConfidence(t.confidence)
      if (!objective_number || confidence == null) continue
      parsedTags.push({ objective_number, confidence })
    }
    out.set(questionIndex, parsedTags)
  }
  return out
}

export function parseTaggingResponse(raw: string): RawTopicTag[] {
  let parsed: { tags?: unknown }
  try {
    parsed = extractJSON(raw) as { tags?: unknown }
  } catch {
    return []
  }
  if (!parsed || !Array.isArray(parsed.tags)) return []

  const out: RawTopicTag[] = []
  for (const item of parsed.tags) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const objective_number = String(row.objective_number ?? '').trim()
    const confidence = normalizeConfidence(row.confidence)
    if (!objective_number || confidence == null) continue
    out.push({ objective_number, confidence })
  }
  return out
}

function buildValidatedTag(
  objective_number: string,
  confidence: number,
  objectiveByNumber: Map<string, SyllabusObjective>,
  paperNumber: string
): ValidatedTopicTag | null {
  const objective = objectiveByNumber.get(objective_number)
  if (!objective) return null
  return {
    objective_number,
    objective_id: objective.id,
    topic_code: objective.topic_code,
    confidence,
    needs_human_review: needsHumanReviewForConfidence(confidence, paperNumber),
  }
}

function promoteTag(
  tags: ValidatedTopicTag[],
  objective_number: string,
  confidence: number,
  objectiveByNumber: Map<string, SyllabusObjective>,
  paperNumber: string
): ValidatedTopicTag[] {
  const promoted =
    tags.find((t) => t.objective_number === objective_number) ??
    buildValidatedTag(objective_number, confidence, objectiveByNumber, paperNumber)
  if (!promoted) return tags
  const rest = tags.filter((t) => t.objective_number !== objective_number)
  return [promoted, ...rest].slice(0, MAX_TAGS_PER_QUESTION)
}

/** Keyword rules for practical/planning papers where the LLM often mis-picks 1.3 sub-objectives. */
export function refineValidatedTags(
  questionText: string,
  tags: ValidatedTopicTag[],
  paperNumber: string,
  objectiveByNumber: Map<string, SyllabusObjective>
): ValidatedTopicTag[] {
  if (tags.length === 0) return tags
  const text = questionText.toLowerCase()

  if (paperNumber === '3') {
    if (/record your results in a table|six sets of values/.test(text)) {
      const refined = promoteTag(tags, '1.3.1', 0.9, objectiveByNumber, paperNumber)
      return applyPaper3TagReviewRule(refined, paperNumber)
    }
    if (/plot a graph|line of best fit/.test(text) && /1\/t|voltmeter|v_s|discharg|capacitor/i.test(text)) {
      const refined = promoteTag(tags, '19.3.1', 0.9, objectiveByNumber, paperNumber)
      return applyPaper3TagReviewRule(refined, paperNumber)
    }
    if (/determine the gradient|gradient and y-intercept/.test(text)) {
      const refined = promoteTag(tags, '19.3.1', 0.88, objectiveByNumber, paperNumber)
      return applyPaper3TagReviewRule(refined, paperNumber)
    }
    if (/connect the circuit|voltmeter|capacitor|polarit/.test(text)) {
      const refined = promoteTag(tags, '10.1.2', 0.9, objectiveByNumber, paperNumber)
      return applyPaper3TagReviewRule(refined, paperNumber)
    }
    if (/measure and record|repeat .*using an angle/.test(text) && !/uncert|percentage/.test(text)) {
      const refined = promoteTag(tags, '1.2.1', 0.85, objectiveByNumber, paperNumber)
      return applyPaper3TagReviewRule(refined, paperNumber)
    }
    if (/sources of uncertainty|limitations of the procedure|describe four improvements/.test(text)) {
      const refined = promoteTag(tags, '1.3.1', 0.95, objectiveByNumber, paperNumber)
      return applyPaper3TagReviewRule(refined, paperNumber)
    }
    return applyPaper3TagReviewRule(tags, paperNumber)
  }

  if (paperNumber === '4') {
    if (/direction of the acceleration|labelled a.*acceleration/.test(text)) {
      return promoteTag(tags, '2.1.1', 0.95, objectiveByNumber, paperNumber)
    }
  }

  if (paperNumber === '5') {
    if (/spring is attached|magnet.*spring|cylindrical magnet/i.test(text)) {
      return promoteTag(tags, '6.1.4', 0.9, objectiveByNumber, paperNumber)
    }
    if (/determine the length.*value of/.test(text) || /determine the length l/i.test(text)) {
      return promoteTag(tags, '2.1.2', 0.88, objectiveByNumber, paperNumber)
    }
    if (/lg\s+t.*against.*lg\s+l|expressions for the gradient and y-intercept/.test(text)) {
      return promoteTag(tags, '2.1.4', 0.88, objectiveByNumber, paperNumber)
    }
    if (/lg\s*\(|logarithm|absolute uncert/.test(text)) {
      return promoteTag(tags, '1.3.3', 0.92, objectiveByNumber, paperNumber)
    }
  }

  return tags
}

/** Paper 3 practical questions without any 1.3.x tag are flagged for human review. */
export function applyPaper3TagReviewRule(
  tags: ValidatedTopicTag[],
  paperNumber: string
): ValidatedTopicTag[] {
  if (paperNumber !== '3' || tags.length === 0) return tags
  const has13 = tags.some(
    (t) => t.topic_code.startsWith('1.3') || t.objective_number.startsWith('1.3.')
  )
  if (has13) return tags
  return tags.map((t) => ({ ...t, needs_human_review: true }))
}

export function validateTopicTags(
  rawTags: RawTopicTag[],
  objectiveByNumber: Map<string, SyllabusObjective>,
  maxTags: number = MAX_TAGS_PER_QUESTION,
  paperNumber?: string
): { accepted: ValidatedTopicTag[]; rejected: RawTopicTag[] } {
  const sorted = [...rawTags].sort((a, b) => b.confidence - a.confidence)
  const accepted: ValidatedTopicTag[] = []
  const rejected: RawTopicTag[] = []
  const seen = new Set<string>()

  for (const tag of sorted) {
    const objective = objectiveByNumber.get(tag.objective_number)
    if (!objective) {
      rejected.push(tag)
      continue
    }
    if (seen.has(tag.objective_number)) continue
    seen.add(tag.objective_number)

    const needs_human_review = paperNumber
      ? needsHumanReviewForConfidence(tag.confidence, paperNumber)
      : tag.confidence < topicTagReviewThreshold('1')
    accepted.push({
      objective_number: tag.objective_number,
      objective_id: objective.id,
      topic_code: objective.topic_code,
      confidence: tag.confidence,
      needs_human_review,
    })
    if (accepted.length >= maxTags) break
  }

  const reviewed = paperNumber
    ? applyPaper3TagReviewRule(accepted, paperNumber)
    : accepted

  return { accepted: reviewed, rejected }
}

function jsonObjectiveToRow(
  subjectCode: string,
  syllabusYear: number,
  sourcePdfPath: string,
  raw: Record<string, unknown>
): SyllabusObjective {
  const objective_number = String(raw.objective_number ?? '').trim()
  return {
    id: deterministicObjectiveId(subjectCode, syllabusYear, objective_number),
    subject_code: subjectCode,
    topic_code: String(raw.topic_code ?? ''),
    topic_title: String(raw.topic_title ?? ''),
    objective_number,
    objective_text: String(raw.objective_text ?? ''),
    command_words: Array.isArray(raw.command_words)
      ? (raw.command_words as string[])
      : null,
    examined_in_papers: Array.isArray(raw.examined_in_papers)
      ? (raw.examined_in_papers as string[])
      : null,
    syllabus_year: syllabusYear,
    source_pdf_path: sourcePdfPath,
    created_at: new Date().toISOString(),
  }
}

export function loadSyllabusObjectivesFromJson(
  rootDir: string,
  subjectCode: string
): SyllabusObjective[] {
  const path = join(rootDir, 'scripts', 'extraction-output', `syllabus_${subjectCode}.json`)
  if (!existsSync(path)) {
    throw new Error(`Syllabus JSON not found: ${path}. Run pnpm extract:syllabus ${subjectCode}`)
  }
  const payload = JSON.parse(readFileSync(path, 'utf8')) as {
    summary?: { syllabusYear?: number }
    objectives?: Record<string, unknown>[]
  }
  const syllabusYear = payload.summary?.syllabusYear ?? 2025
  const sourcePdfPath = `syllabi-source/${subjectCode}.pdf`
  return (payload.objectives ?? []).map((o) =>
    jsonObjectiveToRow(subjectCode, syllabusYear, sourcePdfPath, o)
  )
}

export async function loadSyllabusObjectivesFromDb(
  supabase: SupabaseClient,
  subjectCode: string
): Promise<SyllabusObjective[]> {
  const { data, error } = await supabase
    .from('syllabus_objectives')
    .select('*')
    .eq('subject_code', subjectCode)
    .order('objective_number')

  if (error) throw new Error(`Failed to load syllabus_objectives: ${error.message}`)
  return (data ?? []) as SyllabusObjective[]
}

/** Per-process cache keyed by subject_code (cleared only on process restart). */
export async function getSyllabusObjectives(
  supabase: SupabaseClient,
  subjectCode: string
): Promise<SyllabusObjective[]> {
  if (syllabusCache.has(subjectCode)) {
    return syllabusCache.get(subjectCode)!
  }
  const objectives = await loadSyllabusObjectivesFromDb(supabase, subjectCode)
  syllabusCache.set(subjectCode, objectives)
  return objectives
}

export function clearSyllabusCache(subjectCode?: string): void {
  if (subjectCode) syllabusCache.delete(subjectCode)
  else syllabusCache.clear()
}

function jsonQuestionToRow(
  meta: Record<string, unknown>,
  raw: Record<string, unknown>
): TaggingQuestion {
  return {
    id: String(raw.id),
    subject_code: String(meta.subjectCode),
    paper_number: String(meta.paperNumber),
    variant: String(meta.variant),
    year: Number(meta.year),
    session: String(meta.session),
    question_number: String(raw.question_number),
    question_text: String(raw.question_text),
    marks: raw.marks == null ? null : Number(raw.marks),
    is_leaf: Boolean(raw.is_leaf),
    paper_kind: meta.paperKind ? String(meta.paperKind) : undefined,
  }
}

export function loadQuestionsFromJson(
  rootDir: string,
  sessionCode: string,
  opts: { paperNumber?: string; leavesOnly?: boolean } = {}
): TaggingQuestion[] {
  const outDir = join(rootDir, 'scripts', 'extraction-output')
  const session = sessionCode.toLowerCase()
  const files = readdirSync(outDir).filter(
    (f) =>
      f.includes(`_${session}_qp_`) &&
      f.endsWith('.json') &&
      !f.includes('_ms_')
  )

  const questions: TaggingQuestion[] = []
  for (const file of files) {
    const payload = JSON.parse(readFileSync(join(outDir, file), 'utf8')) as {
      meta?: Record<string, unknown>
      questions?: Record<string, unknown>[]
    }
    const meta = payload.meta
    if (!meta) continue
    if (opts.paperNumber && String(meta.paperNumber) !== opts.paperNumber) continue

    for (const q of payload.questions ?? []) {
      const row = jsonQuestionToRow(meta, q)
      if (opts.leavesOnly !== false && !row.is_leaf) continue
      questions.push(row)
    }
  }

  return questions.sort((a, b) => {
    if (a.paper_number !== b.paper_number) {
      return a.paper_number.localeCompare(b.paper_number, undefined, { numeric: true })
    }
    return a.question_number.localeCompare(b.question_number, undefined, { numeric: true })
  })
}

export async function loadQuestionsFromDb(
  supabase: SupabaseClient,
  subjectCode: string,
  sessionCode: string,
  opts: { paperNumber?: string; leavesOnly?: boolean } = {}
): Promise<TaggingQuestion[]> {
  const sessionName = sessionCodeToName(sessionCode)
  if (!sessionName) throw new Error(`Invalid session code: ${sessionCode}`)

  let query = supabase
    .from('extracted_questions')
    .select(
      'id, subject_code, paper_number, variant, year, session, question_number, question_text, marks, raw_extraction_data'
    )
    .eq('subject_code', subjectCode)
    .eq('session', sessionName)

  if (opts.paperNumber) {
    query = query.eq('paper_number', opts.paperNumber)
  }

  const { data, error } = await query.order('paper_number').order('question_number')
  if (error) throw new Error(`Failed to load extracted_questions: ${error.message}`)

  return (data ?? [])
    .map((row) => {
      const raw = (row.raw_extraction_data ?? {}) as Record<string, unknown>
      return {
        id: row.id,
        subject_code: row.subject_code,
        paper_number: row.paper_number,
        variant: row.variant,
        year: row.year,
        session: row.session,
        question_number: row.question_number,
        question_text: row.question_text,
        marks: row.marks,
        is_leaf: raw.is_leaf !== false,
        paper_kind: typeof raw.paper_kind === 'string' ? raw.paper_kind : undefined,
      } satisfies TaggingQuestion
    })
    .filter((q) => (opts.leavesOnly !== false ? q.is_leaf : true))
}

function finalizeTagResult(
  question: TaggingQuestion,
  rawTags: RawTopicTag[],
  objectiveByNumber: Map<string, SyllabusObjective>,
  raw_response: string,
  rejectedSeed: RawTopicTag[] = [],
  repair_attempted = false
): TagQuestionResult {
  const validated = validateTopicTags(
    rawTags,
    objectiveByNumber,
    MAX_TAGS_PER_QUESTION,
    question.paper_number
  )
  const accepted = refineValidatedTags(
    question.question_text,
    validated.accepted,
    question.paper_number,
    objectiveByNumber
  )
  return {
    question_id: question.id,
    question_number: question.question_number,
    tags: accepted,
    rejected: [...rejectedSeed, ...validated.rejected],
    raw_response,
    repair_attempted,
    tagging_failed: accepted.length === 0,
  }
}

/** Tag up to TAGGING_BATCH_SIZE questions in a single Flash call. */
export async function tagQuestionBatch(
  questions: TaggingQuestion[],
  objectives: SyllabusObjective[],
  objectiveByNumber: Map<string, SyllabusObjective>
): Promise<TagQuestionResult[]> {
  if (questions.length === 0) return []
  if (questions.length === 1) {
    return [await tagOneQuestion(questions[0], objectives, objectiveByNumber)]
  }

  const prompt = buildBatchTopicTaggingPrompt(
    questions.map((q, i) => ({
      index: i + 1,
      questionText: q.question_text,
      marks: q.marks,
      context: {
        subjectCode: q.subject_code,
        paperNumber: q.paper_number,
        variant: q.variant,
        year: q.year,
        session: q.session,
        paperKind: q.paper_kind,
      },
    })),
    objectives
  )

  const raw_response = await generateGeminiText(prompt, {
    task: 'topic-tagging',
    temperature: 0.1,
    maxOutputTokens: 4096,
  })

  const parsed = parseBatchTaggingResponse(raw_response)
  const results: TagQuestionResult[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const rawTags = parsed.get(i + 1) ?? []
    const result = finalizeTagResult(q, rawTags, objectiveByNumber, raw_response)
    if (result.tags.length === 0) {
      const fallback = await tagOneQuestion(q, objectives, objectiveByNumber)
      results.push(fallback)
    } else {
      results.push(result)
    }
  }

  return results
}

export async function tagOneQuestion(
  question: TaggingQuestion,
  objectives: SyllabusObjective[],
  objectiveByNumber: Map<string, SyllabusObjective>
): Promise<TagQuestionResult> {
  const context: TaggingQuestionContext = {
    subjectCode: question.subject_code,
    paperNumber: question.paper_number,
    variant: question.variant,
    year: question.year,
    session: question.session,
    paperKind: question.paper_kind,
  }

  const basePrompt = buildTopicTaggingPrompt(
    question.question_text,
    question.marks,
    context,
    objectives
  )

  let raw_response = ''
  let accepted: ValidatedTopicTag[] = []
  let rejected: RawTopicTag[] = []
  let repair_attempted = false

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? basePrompt
        : `${basePrompt}\n\nYour previous reply was not valid JSON or had no tags. Reply with ONLY the JSON object, no markdown or explanation.`

    raw_response = await generateGeminiText(prompt, {
      task: 'topic-tagging',
      temperature: attempt === 0 ? 0.1 : 0,
      maxOutputTokens: 2048,
    })

    const rawTags = parseTaggingResponse(raw_response)
    const validated = validateTopicTags(
      rawTags,
      objectiveByNumber,
      MAX_TAGS_PER_QUESTION,
      question.paper_number
    )
    accepted = refineValidatedTags(
      question.question_text,
      validated.accepted,
      question.paper_number,
      objectiveByNumber
    )
    rejected = validated.rejected
    if (accepted.length > 0) break
  }

  if (accepted.length === 0) {
    repair_attempted = true
    const repairPrompt = buildJsonRepairPrompt(basePrompt, raw_response)
    const repaired = await generateGeminiText(repairPrompt, {
      task: 'json-repair-retry',
      temperature: 0,
      maxOutputTokens: 2048,
    })
    raw_response = `${raw_response}\n\n--- json-repair-retry ---\n${repaired}`
    return finalizeTagResult(
      question,
      parseTaggingResponse(repaired),
      objectiveByNumber,
      raw_response,
      rejected,
      true
    )
  }

  return finalizeTagResult(
    question,
    parseTaggingResponse(raw_response),
    objectiveByNumber,
    raw_response,
    rejected,
    repair_attempted
  )
}

/** Tag a deliberately ambiguous multi-topic question to verify confidence spread. */
export async function demonstrateConfidenceCalibration(
  objectives: SyllabusObjective[],
  objectiveByNumber: Map<string, SyllabusObjective>
): Promise<ConfidenceCalibrationResult> {
  const q: TaggingQuestion = {
    id: 'calibration-probe',
    subject_code: AMBIGUOUS_CALIBRATION_QUESTION.subject_code,
    paper_number: AMBIGUOUS_CALIBRATION_QUESTION.paper_number,
    variant: AMBIGUOUS_CALIBRATION_QUESTION.variant,
    year: AMBIGUOUS_CALIBRATION_QUESTION.year,
    session: AMBIGUOUS_CALIBRATION_QUESTION.session,
    question_number: 'CAL',
    question_text: AMBIGUOUS_CALIBRATION_QUESTION.question_text,
    marks: AMBIGUOUS_CALIBRATION_QUESTION.marks,
    is_leaf: true,
    paper_kind: AMBIGUOUS_CALIBRATION_QUESTION.paper_kind,
  }

  const result = await tagOneQuestion(q, objectives, objectiveByNumber)
  const confidences = result.tags.map((t) => t.confidence)
  const minConfidence = confidences.length ? Math.min(...confidences) : null
  const maxConfidence = confidences.length ? Math.max(...confidences) : null
  const spreadObserved =
    confidences.length >= 2
      ? maxConfidence! - minConfidence! >= 0.05 || minConfidence! < 0.85
      : minConfidence != null && minConfidence < 0.85

  return {
    tags: result.tags,
    raw_response: result.raw_response,
    spreadObserved,
    minConfidence,
    maxConfidence,
  }
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function tagQuestions(
  questions: TaggingQuestion[],
  objectives: SyllabusObjective[],
  opts: { concurrency?: number; batchSize?: number; useBatchTagging?: boolean } = {}
): Promise<BulkTaggingResult> {
  const objectiveByNumber = new Map(objectives.map((o) => [o.objective_number, o]))
  const concurrency = opts.concurrency ?? 5
  const batchSize = opts.batchSize ?? TAGGING_BATCH_SIZE
  const useBatchTagging = opts.useBatchTagging !== false

  const failures: BulkTaggingResult['failures'] = []
  const results: TagQuestionResult[] = []

  if (useBatchTagging) {
    await runInBatches(
        Array.from(
          { length: Math.ceil(questions.length / batchSize) },
          (_, i) => questions.slice(i * batchSize, i * batchSize + batchSize)
        ),
        concurrency,
        async (batch) => {
          try {
            const batchResults = await tagQuestionBatch(batch, objectives, objectiveByNumber)
            results.push(...batchResults)
            return batchResults
          } catch (e) {
            const error = e instanceof Error ? e.message : String(e)
            for (const q of batch) {
              failures.push({
                question_id: q.id,
                question_number: q.question_number,
                error,
              })
            }
            return null
          }
        }
      )
  } else {
    await runInBatches(questions, concurrency, async (q) => {
      try {
        const result = await tagOneQuestion(q, objectives, objectiveByNumber)
        results.push(result)
        return result
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        failures.push({
          question_id: q.id,
          question_number: q.question_number,
          error,
        })
        return null
      }
    })
  }

  const sessionCode = questions[0]
    ? sessionCodeFromQuestion(questions[0])
    : 'unknown'

  let totalTags = 0
  let lowConfidenceTags = 0
  let rejectedHallucinations = 0
  let questionsTagged = 0

  for (const r of results) {
    if (r.tags.length > 0) questionsTagged++
    totalTags += r.tags.length
    lowConfidenceTags += r.tags.filter((t) => t.needs_human_review).length
    rejectedHallucinations += r.rejected.length
  }

  return {
    subjectCode: questions[0]?.subject_code ?? '9702',
    sessionCode,
    paperFilter: null,
    questionsProcessed: questions.length,
    questionsTagged,
    totalTags,
    lowConfidenceTags,
    rejectedHallucinations,
    failures,
    results,
  }
}

function sessionCodeFromQuestion(q: TaggingQuestion): string {
  const yy = String(q.year).slice(-2)
  const lowered = q.session.toLowerCase()
  const letter = lowered.includes('may')
    ? 's'
    : lowered.includes('october')
      ? 'w'
      : lowered.includes('february')
        ? 'm'
        : 's'
  return `${letter}${yy}`
}

/** Ensure tag rows use DB syllabus_objectives UUIDs (not JSON deterministic hashes). */
export function remapResultsToDbObjectives(
  results: TagQuestionResult[],
  objectives: SyllabusObjective[]
): TagQuestionResult[] {
  const byNumber = new Map(objectives.map((o) => [o.objective_number, o]))
  return results.map((r) => ({
    ...r,
    tags: r.tags.map((t) => {
      const obj = byNumber.get(t.objective_number)
      if (!obj) return t
      return {
        ...t,
        objective_id: obj.id,
        topic_code: obj.topic_code,
      }
    }),
  }))
}

export function toQuestionTopicTagRows(result: TagQuestionResult): NewQuestionTopicTag[] {
  return result.tags.map((t) => ({
    question_id: result.question_id,
    objective_id: t.objective_id,
    topic_code: t.topic_code,
    confidence: t.confidence,
    tagged_by: TAGGED_BY,
    reviewed_by_human: false,
  }))
}

export async function persistQuestionTopicTags(
  supabase: SupabaseClient,
  results: TagQuestionResult[]
): Promise<number> {
  const questionIds = results.map((r) => r.question_id)
  if (questionIds.length === 0) return 0

  const { error: delError } = await supabase
    .from('question_topic_tags')
    .delete()
    .in('question_id', questionIds)
    .eq('tagged_by', TAGGED_BY)

  if (delError) {
    throw new Error(`Failed to clear prior tags: ${delError.message}`)
  }

  const rows = results.flatMap(toQuestionTopicTagRows)
  if (rows.length === 0) return 0

  const { error } = await supabase.from('question_topic_tags').upsert(rows, {
    onConflict: 'question_id,objective_id',
  })

  if (error) throw new Error(`Failed to persist question_topic_tags: ${error.message}`)
  return rows.length
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Deterministic shuffle so stratified audit samples are reproducible across runs. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const copy = [...items]
  const digest = createHash('sha256').update(seed).digest()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = digest.readUInt32BE((i * 4) % 28) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Stratified sample; perPaper can be a number or per-paper overrides (must sum to sampleSize). */
export function pickStratifiedTagSample(
  results: TagQuestionResult[],
  questions: TaggingQuestion[],
  perPaper: number | Record<string, number> = 6,
  sampleSize: number = TAG_AUDIT_SAMPLE_SIZE,
  seed = 'stratified-audit'
): TagQuestionResult[] {
  const tagged = results.filter((r) => r.tags.length > 0)
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const byPaper = new Map<string, TagQuestionResult[]>()

  for (const r of tagged) {
    const q = questionById.get(r.question_id)
    if (!q) continue
    const list = byPaper.get(q.paper_number) ?? []
    list.push(r)
    byPaper.set(q.paper_number, list)
  }

  const picked: TagQuestionResult[] = []
  const paperOrder = [...byPaper.keys()].sort((a, b) => Number(a) - Number(b))

  for (const paper of paperOrder) {
    const pool = seededShuffle(byPaper.get(paper) ?? [], `${seed}:paper:${paper}`)
    const n =
      typeof perPaper === 'number' ? perPaper : (perPaper[paper] ?? 0)
    picked.push(...pool.slice(0, n))
  }

  if (picked.length < sampleSize) {
    const pickedIds = new Set(picked.map((r) => r.question_id))
    const remainder = seededShuffle(
      tagged.filter((r) => !pickedIds.has(r.question_id)),
      `${seed}:remainder`
    )
    picked.push(...remainder.slice(0, sampleSize - picked.length))
  }

  return picked.slice(0, sampleSize)
}

function normalizeAuditVerdict(
  parsed: Record<string, unknown>,
  tagCount: number
): { primary_tag_correct: boolean; secondary_tags_correct: boolean; reason: string } {
  const primary_tag_correct = Boolean(parsed.primary_tag_correct)
  let secondary_tags_correct = Boolean(
    parsed.secondary_tags_correct ?? parsed.overall_tags_acceptable
  )
  const reason = String(parsed.reason ?? '').trim()

  if (tagCount <= 1 && primary_tag_correct) {
    secondary_tags_correct = true
  }

  const normalizedReason =
    reason ||
    (primary_tag_correct
      ? tagCount <= 1
        ? 'Single primary tag is correct.'
        : 'Primary tag accepted; secondary tags not separately evaluated.'
      : 'Primary tag rejected.')

  if (tagCount <= 1 && primary_tag_correct) {
    secondary_tags_correct = true
  } else if (primary_tag_correct && !reason) {
    secondary_tags_correct = true
  }

  return {
    primary_tag_correct,
    secondary_tags_correct,
    reason: normalizedReason,
  }
}

export async function auditTagSample(
  results: TagQuestionResult[],
  questions: TaggingQuestion[],
  objectiveByNumber: Map<string, SyllabusObjective>,
  opts: {
    sampleSize?: number
    perPaper?: number | Record<string, number>
    stratified?: boolean
    auditSeed?: string
  } = {}
): Promise<TagAuditResult> {
  const sampleSize = opts.sampleSize ?? TAG_AUDIT_SAMPLE_SIZE
  const stratified = opts.stratified !== false
  const tagged = results.filter((r) => r.tags.length > 0)
  const sample = stratified
    ? pickStratifiedTagSample(
        tagged,
        questions,
        opts.perPaper ?? 6,
        sampleSize,
        opts.auditSeed ?? 'stratified-audit'
      )
    : shuffle(tagged).slice(0, sampleSize)
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const perPaperCounts: Record<string, number> = {}

  const samples: TagAuditSample[] = []

  for (const r of sample) {
    const q = questionById.get(r.question_id)
    if (!q) continue
    perPaperCounts[q.paper_number] = (perPaperCounts[q.paper_number] ?? 0) + 1

    const context: TaggingQuestionContext = {
      subjectCode: q.subject_code,
      paperNumber: q.paper_number,
      variant: q.variant,
      year: q.year,
      session: q.session,
      paperKind: q.paper_kind,
    }

    const auditTags = r.tags.map((t) => {
      const obj = objectiveByNumber.get(t.objective_number)
      return {
        objective_number: t.objective_number,
        objective_text: obj?.objective_text ?? t.objective_number,
        confidence: t.confidence,
      }
    })

    const prompt = buildTagAuditPrompt(q.question_text, q.marks, context, auditTags)
    const raw = await generateGeminiText(prompt, {
      task: 'topic-tagging',
      temperature: 0,
      maxOutputTokens: 512,
    })

    let verdict = {
      primary_tag_correct: false,
      secondary_tags_correct: false,
      reason: 'parse failed',
    }
    try {
      const parsed = extractJSON(raw) as Record<string, unknown>
      verdict = normalizeAuditVerdict(parsed, r.tags.length)
    } catch {
      verdict.reason = `Audit parse error: ${raw.slice(0, 200)}`
    }

    samples.push({
      question_id: r.question_id,
      question_number: r.question_number,
      paper_number: q.paper_number,
      question_text: q.question_text.slice(0, 500),
      marks: q.marks,
      tags: r.tags,
      ...verdict,
    })
  }

  const n = samples.length || 1
  const primaryCorrect = samples.filter((s) => s.primary_tag_correct).length
  const withSecondary = samples.filter((s) => s.tags.length >= 2)
  const secondaryCorrect = withSecondary.filter((s) => s.secondary_tags_correct).length

  return {
    sampleSize: samples.length,
    samplingMethod: stratified ? 'stratified' : 'random',
    perPaperCounts,
    primaryAccuracy: primaryCorrect / n,
    secondaryAccuracy: withSecondary.length
      ? secondaryCorrect / withSecondary.length
      : null,
    secondarySampleSize: withSecondary.length,
    meetsTarget: primaryCorrect / n >= TAG_ACCURACY_TARGET,
    samples,
  }
}

export function writeTaggingOutput(
  rootDir: string,
  bulk: BulkTaggingResult,
  audit?: TagAuditResult,
  calibration?: ConfidenceCalibrationResult
): string {
  const outDir = join(rootDir, 'scripts', 'extraction-output')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, `topic_tags_${bulk.subjectCode}_${bulk.sessionCode}.json`)

  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        taggedBy: TAGGED_BY,
        summary: {
          subjectCode: bulk.subjectCode,
          sessionCode: bulk.sessionCode,
          paperFilter: bulk.paperFilter,
          questionsProcessed: bulk.questionsProcessed,
          questionsTagged: bulk.questionsTagged,
          totalTags: bulk.totalTags,
          lowConfidenceTags: bulk.lowConfidenceTags,
          rejectedHallucinations: bulk.rejectedHallucinations,
          failureCount: bulk.failures.length,
        },
        audit: audit
          ? {
              sampleSize: audit.sampleSize,
              samplingMethod: audit.samplingMethod,
              perPaperCounts: audit.perPaperCounts,
              primaryAccuracy: audit.primaryAccuracy,
              secondaryAccuracy: audit.secondaryAccuracy,
              secondarySampleSize: audit.secondarySampleSize,
              meetsTarget: audit.meetsTarget,
              target: TAG_ACCURACY_TARGET,
            }
          : null,
        failures: bulk.failures,
        results: bulk.results,
        auditSamples: audit?.samples ?? null,
        confidenceCalibration: calibration ?? null,
      },
      null,
      2
    )
  )

  return outPath
}

export type RunAuditOnlyOptions = {
  rootDir: string
  sessionCode: string
  subjectCode?: string
  supabase?: SupabaseClient
}

/** Re-run stratified audit + calibration from saved topic_tags JSON (no re-tagging). */
export async function runAuditOnly(
  opts: RunAuditOnlyOptions
): Promise<{ bulk: BulkTaggingResult; audit: TagAuditResult; calibration: ConfidenceCalibrationResult; outPath: string }> {
  const subjectCode = opts.subjectCode ?? '9702'
  const tagPath = join(
    opts.rootDir,
    'scripts',
    'extraction-output',
    `topic_tags_${subjectCode}_${opts.sessionCode.toLowerCase()}.json`
  )
  if (!existsSync(tagPath)) {
    throw new Error(`Tagging output not found: ${tagPath}`)
  }

  const saved = JSON.parse(readFileSync(tagPath, 'utf8')) as {
    results: TagQuestionResult[]
  }

  let questions: TaggingQuestion[] = []
  let objectives: SyllabusObjective[] = []

  if (opts.supabase) {
    questions = await loadQuestionsFromDb(opts.supabase, subjectCode, opts.sessionCode, {
      leavesOnly: true,
    })
    objectives = await getSyllabusObjectives(opts.supabase, subjectCode)
  }
  if (questions.length === 0) {
    questions = loadQuestionsFromJson(opts.rootDir, opts.sessionCode, { leavesOnly: true })
  }
  if (objectives.length === 0) {
    objectives = loadSyllabusObjectivesFromJson(opts.rootDir, subjectCode)
  }

  const objectiveByNumber = new Map(objectives.map((o) => [o.objective_number, o]))
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const refinedResults = saved.results.map((r) => {
    const q = questionById.get(r.question_id)
    if (!q) return r
    return {
      ...r,
      tags: refineValidatedTags(q.question_text, r.tags, q.paper_number, objectiveByNumber),
    }
  })

  const bulk: BulkTaggingResult = {
    subjectCode,
    sessionCode: opts.sessionCode.toLowerCase(),
    paperFilter: null,
    questionsProcessed: refinedResults.length,
    questionsTagged: refinedResults.filter((r) => r.tags.length > 0).length,
    totalTags: refinedResults.reduce((n, r) => n + r.tags.length, 0),
    lowConfidenceTags: refinedResults.reduce(
      (n, r) => n + r.tags.filter((t) => t.needs_human_review).length,
      0
    ),
    rejectedHallucinations: refinedResults.reduce((n, r) => n + r.rejected.length, 0),
    failures: [],
    results: refinedResults,
  }

  if (opts.supabase) {
    const inserted = await persistQuestionTopicTags(opts.supabase, refinedResults)
    console.log(`Persisted ${inserted} refined question_topic_tags rows`)
  }

  const audit = await auditTagSample(bulk.results, questions, objectiveByNumber, {
    stratified: true,
    perPaper: { '1': 6, '2': 6, '3': 8, '4': 5, '5': 5 },
    auditSeed: `${subjectCode}-${opts.sessionCode.toLowerCase()}`,
  })
  const calibration = await demonstrateConfidenceCalibration(objectives, objectiveByNumber)
  const outPath = writeTaggingOutput(opts.rootDir, bulk, audit, calibration)
  return { bulk, audit, calibration, outPath }
}

export type RunTopicTaggingOptions = {
  rootDir: string
  sessionCode: string
  subjectCode?: string
  paperNumber?: string
  persist?: boolean
  audit?: boolean
  supabase?: SupabaseClient
  concurrency?: number
}

export async function runTopicTagging(
  opts: RunTopicTaggingOptions
): Promise<{
  bulk: BulkTaggingResult
  audit?: TagAuditResult
  calibration?: ConfidenceCalibrationResult
  outPath: string
}> {
  const subjectCode = opts.subjectCode ?? '9702'
  const leavesOnly = true

  let questions: TaggingQuestion[] = []
  let objectives: SyllabusObjective[] = []

  if (opts.supabase) {
    questions = await loadQuestionsFromDb(opts.supabase, subjectCode, opts.sessionCode, {
      paperNumber: opts.paperNumber,
      leavesOnly,
    })
    objectives = await getSyllabusObjectives(opts.supabase, subjectCode)
  }

  if (questions.length === 0) {
    questions = loadQuestionsFromJson(opts.rootDir, opts.sessionCode, {
      paperNumber: opts.paperNumber,
      leavesOnly,
    })
  }

  if (objectives.length === 0) {
    objectives = loadSyllabusObjectivesFromJson(opts.rootDir, subjectCode)
  }

  if (questions.length === 0) {
    throw new Error(
      `No extracted questions for session ${opts.sessionCode}` +
        (opts.paperNumber ? ` paper ${opts.paperNumber}` : '')
    )
  }

  if (objectives.length === 0) {
    throw new Error(`No syllabus objectives for subject ${subjectCode}`)
  }

  const bulk = await tagQuestions(questions, objectives, {
    concurrency: opts.concurrency,
  })
  bulk.sessionCode = opts.sessionCode.toLowerCase()
  bulk.paperFilter = opts.paperNumber ?? null

  if (bulk.paperFilter) {
    const mergedPath = join(
      opts.rootDir,
      'scripts',
      'extraction-output',
      `topic_tags_${subjectCode}_${opts.sessionCode.toLowerCase()}.json`
    )
    if (existsSync(mergedPath)) {
      const prev = JSON.parse(readFileSync(mergedPath, 'utf8')) as {
        results?: TagQuestionResult[]
      }
      const byId = new Map((prev.results ?? []).map((r) => [r.question_id, r]))
      for (const r of bulk.results) byId.set(r.question_id, r)
      bulk.results = [...byId.values()]
    }
    const allQuestions = opts.supabase
      ? await loadQuestionsFromDb(opts.supabase, subjectCode, opts.sessionCode, {
          leavesOnly: true,
        })
      : loadQuestionsFromJson(opts.rootDir, opts.sessionCode, { leavesOnly: true })
    bulk.questionsProcessed = allQuestions.length
    bulk.questionsTagged = bulk.results.filter((r) => r.tags.length > 0).length
    bulk.totalTags = bulk.results.reduce((n, r) => n + r.tags.length, 0)
    bulk.lowConfidenceTags = bulk.results.reduce(
      (n, r) => n + r.tags.filter((t) => t.needs_human_review).length,
      0
    )
    bulk.rejectedHallucinations = bulk.results.reduce((n, r) => n + r.rejected.length, 0)
  }

  if (bulk.questionsProcessed === 0) {
    bulk.questionsProcessed = bulk.results.length
  }

  let persistObjectives = objectives
  if (opts.persist && opts.supabase) {
    persistObjectives = await loadSyllabusObjectivesFromDb(opts.supabase, subjectCode)
    if (persistObjectives.length === 0) {
      throw new Error(
        `syllabus_objectives empty for ${subjectCode} — run pnpm extract:syllabus ${subjectCode} --persist`
      )
    }
    bulk.results = remapResultsToDbObjectives(bulk.results, persistObjectives)
  }

  let audit: TagAuditResult | undefined
  let calibration: ConfidenceCalibrationResult | undefined
  const objectiveByNumber = new Map(persistObjectives.map((o) => [o.objective_number, o]))

  if (opts.audit !== false) {
    audit = await auditTagSample(bulk.results, questions, objectiveByNumber, {
      stratified: true,
      perPaper: { '1': 6, '2': 6, '3': 8, '4': 5, '5': 5 },
      auditSeed: `${subjectCode}-${opts.sessionCode.toLowerCase()}`,
    })
    calibration = await demonstrateConfidenceCalibration(objectives, objectiveByNumber)
  }

  const outPath = writeTaggingOutput(opts.rootDir, bulk, audit, calibration)

  if (opts.persist && opts.supabase) {
    const inserted = await persistQuestionTopicTags(opts.supabase, bulk.results)
    console.log(`Persisted ${inserted} question_topic_tags rows`)
  }

  return { bulk, audit, calibration, outPath }
}
