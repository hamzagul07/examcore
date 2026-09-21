import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { paperPdfPath } from '@/lib/paper-storage'
import { getStoragePrefixForSubjectCode } from '@/lib/subject-papers'
import { resolveMarkingTypeForPaper } from './component-types'
import {
  buildExtractionPrompt,
  buildTargetedExtractionPrompt,
  validateExtractedQuestion,
  questionMarkingType,
} from './extraction-prompts'
import { belongsToQuestion } from './question-number'
import {
  mergeSubPartQuestions,
  normalizeExtractedQuestion,
} from './normalize-extracted-scheme'
import { extractJSON } from './json'
import { sessionNameToCode } from './session'
import type { MarkSchemeRow, MarkingStyle } from './types'

export type ExtractionMode = 'full' | 'targeted'

export type StorageExtractOptions = {
  mode?: ExtractionMode
  /** Required when mode is targeted; defaults to question_number */
  targetQuestion?: string
}

export type StorageExtractDeps = {
  downloadPdf: (path: string) => Promise<ArrayBuffer | null>
  extractFromPdfs: (
    qpBase64: string,
    msBase64: string,
    prompt: string
  ) => Promise<string>
  upsertSchemes: (rows: Record<string, unknown>[]) => Promise<void>
  findScheme: (
    paperCode: string,
    paperSession: string,
    questionNumber: string
  ) => Promise<MarkSchemeRow | null>
}

export async function tryExtractFromStorage(
  paper_code: string,
  paper_session: string,
  question_number: string,
  deps: StorageExtractDeps,
  options?: StorageExtractOptions
): Promise<MarkSchemeRow | null> {
  const mode = options?.mode ?? 'targeted'
  const targetQuestion = (options?.targetQuestion ?? question_number).trim()
  try {
    const [subject_code, component] = paper_code.split('/')
    if (!subject_code || !component) return null

    const session_code = sessionNameToCode(paper_session)
    if (!session_code) return null

    const paperMarkingType = resolveMarkingTypeForPaper(paper_code)
    const storagePrefix = getStoragePrefixForSubjectCode(subject_code)
    const qpPath = paperPdfPath(storagePrefix, subject_code, session_code, 'qp', component)
    const msPath = paperPdfPath(storagePrefix, subject_code, session_code, 'ms', component)

    const [qpBuf, msBuf] = await Promise.all([
      deps.downloadPdf(qpPath),
      deps.downloadPdf(msPath),
    ])
    if (!qpBuf || !msBuf) return null

    const qpBase64 = Buffer.from(qpBuf).toString('base64')
    const msBase64 = Buffer.from(msBuf).toString('base64')
    const extractionPrompt =
      mode === 'full'
        ? buildExtractionPrompt(paperMarkingType)
        : buildTargetedExtractionPrompt(paperMarkingType, targetQuestion)

    let extractionText = ''
    try {
      extractionText = await deps.extractFromPdfs(
        qpBase64,
        msBase64,
        extractionPrompt
      )
    } catch (err) {
      console.error('Gemini extraction error:', err)
      return null
    }

    let parsed: Record<string, unknown>
    try {
      parsed = extractJSON(extractionText) as Record<string, unknown>
    } catch (err) {
      console.error('Mark scheme extraction returned malformed JSON:', err)
      return null
    }

    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      console.error('Mark scheme extraction returned no questions')
      return null
    }

    const subject = SUBJECT_CODE_MAP[subject_code] || 'Unknown'
    const rows: Record<string, unknown>[] = []

    // Translate model-shaped output (prose allocations, "8-10" level strings,
    // `type: "mixed"`, bare-array schemes) into the validator's shapes, then
    // synthesise any parent question the model only returned as sub-parts.
    const normalised = (parsed.questions as Record<string, unknown>[]).map((raw) =>
      normalizeExtractedQuestion(raw, paperMarkingType)
    )
    const candidates = mergeSubPartQuestions(normalised, paperMarkingType)

    for (const q of candidates) {
      if (!validateExtractedQuestion(q, paperMarkingType)) {
        // A five-point extraction for an eight-mark question used to become a
        // shared permanent rubric; name every rejected row in server telemetry,
        // with the shape it came in, so the next rejection is diagnosable from
        // the log line alone.
        const ms = q.mark_scheme
        const shape =
          ms && typeof ms === 'object' ? Object.keys(ms as object).join(',') : typeof ms
        console.error(
          `Rejected extracted mark scheme for question ${String(q.question_number ?? '(missing)')} (mark_scheme keys: ${shape})`
        )
        continue
      }
      // Targeted mode keeps the question asked for AND its sub-parts, so a
      // later "3(a)" lookup hits the cache instead of extracting again.
      if (
        mode === 'targeted' &&
        !belongsToQuestion(String(q.question_number), targetQuestion)
      ) {
        continue
      }
      const totalMarks =
        typeof q.total_marks === 'number' ? q.total_marks : Number(q.total_marks)
      const qType = questionMarkingType(q, paperMarkingType)

      rows.push({
        paper_code,
        paper_session,
        question_number: String(q.question_number).trim(),
        question_text: typeof q.question_text === 'string' ? q.question_text : '',
        total_marks: totalMarks,
        mark_scheme: q.mark_scheme,
        marking_type: qType,
        subject,
        board: 'Cambridge International',
      })
    }

    if (rows.length === 0) {
      console.error('All extracted questions failed validation')
      return null
    }

    await deps.upsertSchemes(rows)

    return deps.findScheme(paper_code, paper_session, question_number)
  } catch (err) {
    console.error('tryExtractFromStorage unexpected error:', err)
    return null
  }
}

export function resolveQuestionMarkingStyle(
  markScheme: MarkSchemeRow | null,
  paperCode: string
): MarkingStyle {
  if (markScheme?.marking_type) return markScheme.marking_type
  if (
    markScheme?.mark_scheme?.type &&
    typeof markScheme.mark_scheme.type === 'string'
  ) {
    const t = markScheme.mark_scheme.type as MarkingStyle
    if (['mcq', 'point_based', 'level_of_response', 'mixed'].includes(t)) {
      return t
    }
  }
  return resolveMarkingTypeForPaper(paperCode)
}
