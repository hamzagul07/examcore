import type { MarkingStyle } from './types'
import {
  build9709OfficialMarkingPrompt,
  build9709GeneralMarkingPrompt,
  buildPointBasedMarkingPrompt,
  buildLorMarkingPrompt,
  buildMcqMarkingPrompt,
} from './prompts'
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
}): string {
  const {
    markScheme,
    markingStyle,
    ocrText,
    questionText,
    subjectName,
    subjectCode,
    isOfficial,
  } = params

  const parsed = markScheme?.paper_code
    ? parsePaperCode(markScheme.paper_code)
    : null
  const effectiveCode = parsed?.subjectCode ?? subjectCode
  const is9709 = effectiveCode === '9709'
  const syllabusBlock =
    effectiveCode && !is9709
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
  if (style === 'level_of_response') return 4000
  if (style === 'mcq') return 4000
  return 3000
}
