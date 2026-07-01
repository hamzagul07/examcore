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
} from './prompts'
import { isIbSubjectCode, ibUsesCriterionRubrics } from '@/lib/ib/marking-config'
import type { ResolvedIbComponent } from './types'

const IB_BOARD = 'IB Diploma'
import type { MarkSchemeRow } from './types'
import { parsePaperCode } from './component-types'
import { buildSyllabusTaggingBlock } from '@/lib/syllabi'

export function buildMarkingPrompt(params: {
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
}): string {
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
  } = params

  // M1 — catalog-driven IB points marking. Only engages when the upload resolved
  // to a catalogued IB points component; everything below is unchanged otherwise.
  if (resolvedIb && resolvedIb.assessmentModel === 'points') {
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
          : null,
      totalMarks: questionTotalMarks ?? null,
    })
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
    return buildPointBasedMarkingPrompt(
      subjectName,
      questionText || '[Question not provided — infer from student\'s work]',
      10,
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
      return buildMcqMarkingPrompt(subjectName, msJson, ocrText, total)
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
    return buildIbPointBasedMarkingPrompt(subjectName, qText, total, msJson, ocrText)
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
  if (style === 'level_of_response') return 8192
  if (style === 'mcq') return 4096
  return 6144
}
