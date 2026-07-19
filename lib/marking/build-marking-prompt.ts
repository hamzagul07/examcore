import type { MarkingStyle } from './types'
import {
  build9709OfficialMarkingPrompt,
  build9709GeneralMarkingPrompt,
  buildPointBasedMarkingPrompt,
  buildLorMarkingPrompt,
  buildMcqMarkingPrompt,
  buildIbPointBasedMarkingPrompt,
  buildIbLorMarkingPrompt,
  buildIbCriterionMarkingPrompt,
  buildIbCatalogPointsPrompt,
  INJECTION_GUARD_BLOCK,
} from './prompts'
import { isIbSubjectCode, ibUsesCriterionRubrics } from '@/lib/ib/marking-config'
import type { ResolvedIbComponent } from './types'

const IB_BOARD = 'IB Diploma'

/**
 * Heuristic: does this question text look like multiple-choice? True only when
 * all four option markers (A B C D) appear at the START of a line as "A." / "A)"
 * — real MCQ options sit on their own lines. Requiring line-anchoring + all four
 * avoids misrouting prose that merely enumerates "A. …, B. …, C. …" mid-sentence
 * (L4). A science Paper 1 Section-A upload still routes to MCQ solve-mode.
 */
export function looksLikeMcq(questionText: string): boolean {
  if (!questionText) return false
  const present = (['A', 'B', 'C', 'D'] as const).filter((letter) =>
    new RegExp(`(^|\\n)\\s*${letter}[.)]\\s`).test(questionText)
  ).length
  return present === 4
}
import type { MarkSchemeRow } from './types'
import { parsePaperCode } from './component-types'
import { buildSyllabusTaggingBlock } from '@/lib/syllabi'

type BuildMarkingPromptParams = {
  markScheme: MarkSchemeRow | null
  markingStyle: MarkingStyle
  ocrText: string
  questionText: string
  subjectName: string
  subjectCode: string
  isOfficial: boolean
  /** M1: when present, a resolved IB catalog component drives routing. */
  resolvedIb?: ResolvedIbComponent | null
  /** Optional student-supplied total marks for this question (deterministic denominator). */
  questionTotalMarks?: number | null
  /** Derive-then-mark: a mark scheme derived for this question (JSON string) when no official one exists. */
  derivedScheme?: string | null
}

/**
 * Public entry point. Prepends the untrusted-input guard once — every marking
 * path funnels through here, so the guard covers all styles/boards without
 * touching the individual (regression-tuned) builder bodies.
 */
export function buildMarkingPrompt(params: BuildMarkingPromptParams): string {
  return `${INJECTION_GUARD_BLOCK}\n\n${buildMarkingPromptBody(params)}`
}

function buildMarkingPromptBody(params: BuildMarkingPromptParams): string {
  const {
    markScheme,
    markingStyle,
    ocrText,
    questionText,
    subjectName,
    subjectCode,
    isOfficial,
    resolvedIb,
    questionTotalMarks,
    derivedScheme,
  } = params

  // M1 — catalog-driven IB points marking. Only engages when the upload resolved
  // to a catalogued IB points component; everything below is unchanged otherwise.
  if (resolvedIb && resolvedIb.assessmentModel === 'points') {
    // A points paper whose uploaded question is multiple-choice (e.g. the science
    // Paper 1 Section-A MCQs) is marked board-aware in solve-mode: no stored answer
    // key — the marker works out each correct option, then marks the student.
    if (looksLikeMcq(questionText)) {
      return buildMcqMarkingPrompt(
        resolvedIb.subjectName || subjectName,
        null,
        ocrText,
        questionTotalMarks ?? 0,
        undefined,
        { board: IB_BOARD, questionPaper: questionText }
      )
    }
    return buildIbCatalogPointsPrompt({
      subjectName: resolvedIb.subjectName || subjectName,
      componentLabel: resolvedIb.componentLabel,
      questionText,
      ocrText,
      accept: resolvedIb.pointsConventions?.accept,
      ecf: resolvedIb.pointsConventions?.ecf,
      officialScheme:
        resolvedIb.officialScheme != null
          ? JSON.stringify(resolvedIb.officialScheme)
          : derivedScheme ?? null,
      totalMarks: questionTotalMarks ?? null,
      // IB maths (AA/AI) gets the official M/A/AG/FT/ISW/MR convention block.
      mathConventions: /math/i.test(resolvedIb.subjectName || subjectName),
    })
  }

  // M3 — catalog-driven IB criteria/markband marking. Assembles the criterion
  // markscheme from the resolved catalog criteria (verbatim descriptors, or the
  // optional operational marking_guidance where authored) and reuses the proven
  // criterion prompt, which emits the criteria_results + band_result contract.
  if (
    resolvedIb &&
    resolvedIb.assessmentModel === 'criteria' &&
    resolvedIb.criteria &&
    resolvedIb.criteria.length > 0
  ) {
    const total =
      resolvedIb.maxMarks ??
      resolvedIb.criteria.reduce((sum, c) => sum + c.maxMarks, 0)
    const schemeJson = JSON.stringify(
      {
        type: 'criterion',
        assessment: 'criterion',
        total_marks: total,
        criteria: resolvedIb.criteria.map((c) => ({
          id: c.letter,
          name: c.name,
          max_marks: c.maxMarks,
          guidance: c.guidance ?? undefined,
          // Operational examiner brief (from TSM) — sits alongside the verbatim
          // descriptors to sharpen how the level is applied, not replace them.
          examiner_marking_guidance: c.markingGuidance ?? undefined,
          bands: c.bands.map((b) => ({
            marks_min: b.min,
            marks_max: b.max,
            descriptor: b.guidance?.trim() || b.descriptor,
          })),
        })),
      },
      null,
      2
    )
    return buildIbCriterionMarkingPrompt(
      resolvedIb.subjectName || subjectName,
      questionText,
      total,
      schemeJson,
      ocrText
    )
  }

  const isIb =
    markScheme?.board === IB_BOARD || isIbSubjectCode(subjectCode)
  const parsed = markScheme?.paper_code
    ? parsePaperCode(markScheme.paper_code)
    : null
  const effectiveCode = parsed?.subjectCode ?? subjectCode
  const is9709 = !isIb && effectiveCode === '9709'
  const syllabusBlock =
    effectiveCode && !is9709 && !isIb
      ? buildSyllabusTaggingBlock(effectiveCode)
      : undefined

  if (is9709 && isOfficial && markScheme) {
    return build9709OfficialMarkingPrompt(
      markScheme.question_text,
      markScheme.total_marks,
      JSON.stringify(markScheme.mark_scheme, null, 2),
      ocrText
    )
  }

  if (is9709 && !isOfficial) {
    return build9709GeneralMarkingPrompt(questionText, ocrText)
  }

  if (!markScheme) {
    // No official scheme: use the student-supplied total when given, otherwise
    // let the model read the mark allocation from the question (0 = infer). Never
    // fall back to a fixed denominator — that was the source of wrong totals.
    return buildPointBasedMarkingPrompt(
      subjectName,
      questionText || '[Question not provided — infer from student\'s work]',
      questionTotalMarks && questionTotalMarks > 0 ? questionTotalMarks : 0,
      derivedScheme ??
        '{"marks":[{"id":1,"type":"B1","value":1,"description":"Award marks using standard Cambridge conventions for this subject"}]}',
      ocrText,
      syllabusBlock
    )
  }

  const msJson = JSON.stringify(markScheme.mark_scheme, null, 2)
  const qText = markScheme.question_text || questionText
  const total = markScheme.total_marks

  const effectiveStyle =
    (markScheme.mark_scheme?.type as MarkingStyle) || markingStyle

  if (isIb) {
    if (effectiveStyle === 'mcq') {
      return buildMcqMarkingPrompt(subjectName, msJson, ocrText, total, undefined, {
        board: IB_BOARD,
      })
    }
    if (
      ibUsesCriterionRubrics(subjectCode) ||
      (markScheme.mark_scheme?.assessment === 'criterion')
    ) {
      return buildIbCriterionMarkingPrompt(
        subjectName,
        qText,
        total,
        msJson,
        ocrText
      )
    }
    if (effectiveStyle === 'level_of_response') {
      return buildIbLorMarkingPrompt(subjectName, qText, total, msJson, ocrText)
    }
    // Prefer a derived per-question scheme over the generic practice-profile scheme.
    return buildIbPointBasedMarkingPrompt(
      subjectName,
      qText,
      total,
      derivedScheme ?? msJson,
      ocrText
    )
  }

  if (effectiveStyle === 'mcq') {
    return buildMcqMarkingPrompt(subjectName, msJson, ocrText, total, syllabusBlock)
  }
  if (effectiveStyle === 'level_of_response') {
    return buildLorMarkingPrompt(
      subjectName,
      qText,
      total,
      msJson,
      ocrText,
      syllabusBlock
    )
  }
  return buildPointBasedMarkingPrompt(
    subjectName,
    qText,
    total,
    msJson,
    ocrText,
    syllabusBlock
  )
}

export function maxTokensForStyle(style: MarkingStyle): number {
  // level_of_response covers IB criteria/markband marking, whose output is large
  // (per-criterion band descriptor + justification + strengths/improvements, plus
  // a roll-up band_result). Give it more first-attempt room so it doesn't truncate.
  // Marking runs on Gemini Pro, whose thinking tokens draw from the same budget,
  // so a long multi-part answer (e.g. a 16-mark question with per-mark reasoning
  // + summary) needs generous headroom or the trailing summary truncates.
  if (style === 'level_of_response') return 14000
  if (style === 'mcq') return 4096
  return 10000
}
