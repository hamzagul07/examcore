import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { extractJSON } from '@/lib/marking/json'
import { buildPracticeScriptPrompt } from '@/lib/marking/prompts'
import { withAnthropicRetry } from '@/lib/marking/gemini-retry'
import {
  markSingleQuestion,
  anthropic,
} from '@/lib/marking/mark-runner'
import type { OcrLine } from '@/lib/examiner-ink-positioning'
import type { MarkProgressEvent } from '@/lib/marking/mark-progress'
import type { MarkingMode, QuestionMarkResult } from '@/lib/marking/types'
import {
  aggregateWholePaperResults,
  toMarkingAIResult,
} from '@/lib/marking/whole-paper'
import { buildPerPageInk } from '@/lib/marking/ink-per-page'

export type PracticeSegmentQuestion = {
  question_number: string
  question_text: string
  answer_text: string
}

export type PracticeScriptAnalysis = {
  question_visible_on_answer: boolean
  questions: PracticeSegmentQuestion[]
}

export function parsePracticeScript(raw: string): PracticeScriptAnalysis | null {
  try {
    const parsed = extractJSON(raw) as Record<string, unknown>
    if (!parsed || !Array.isArray(parsed.questions)) return null
    const questions = (parsed.questions as Record<string, unknown>[])
      .filter((q) => typeof q.question_number === 'string')
      .map((q) => ({
        question_number: String(q.question_number).trim(),
        question_text:
          typeof q.question_text === 'string' ? q.question_text.trim() : '',
        answer_text:
          typeof q.answer_text === 'string' ? q.answer_text.trim() : '',
      }))
      .filter((q) => q.answer_text.length >= 5)

    return {
      question_visible_on_answer: parsed.question_visible_on_answer === true,
      questions,
    }
  } catch {
    return null
  }
}

export async function segmentPracticeScript(
  ocrText: string,
  userQuestionText: string,
  subjectCode: string
): Promise<PracticeScriptAnalysis> {
  const subjectName = SUBJECT_CODE_MAP[subjectCode] || 'A-Level'
  const response = await withAnthropicRetry(
    () =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: buildPracticeScriptPrompt(
              ocrText,
              userQuestionText,
              subjectName,
              subjectCode
            ),
          },
        ],
      }),
    { label: 'claude-practice-segment' }
  )
  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parsePracticeScript(text)
  if (!parsed || parsed.questions.length === 0) {
    return { question_visible_on_answer: false, questions: [] }
  }
  return parsed
}

function ensureQuestionTexts(
  questions: PracticeSegmentQuestion[],
  userQuestionText: string
): PracticeSegmentQuestion[] {
  const userQ = userQuestionText.trim()
  if (questions.length === 1 && userQ.length >= 10 && !questions[0].question_text) {
    return [{ ...questions[0], question_text: userQ }]
  }
  if (userQ.length >= 10) {
    return questions.map((q) =>
      q.question_text.length >= 10 ? q : { ...q, question_text: userQ }
    )
  }
  return questions
}

export function practiceQuestionsNeedUserInput(
  questions: PracticeSegmentQuestion[]
): boolean {
  return questions.some((q) => q.question_text.trim().length < 10)
}

export async function markPracticeScript(params: {
  practiceCode: string
  ocrText: string
  ocrLines: OcrLine[]
  pageOcrResults: Array<{ photo_url: string | null; lines: OcrLine[] }>
  userQuestionText: string
  onProgress?: (event: MarkProgressEvent) => void
}): Promise<
  | {
      kind: 'single'
      questionText: string
      answerText: string
      questionNumber?: string
    }
  | {
      kind: 'multi'
      wholePaper: ReturnType<typeof aggregateWholePaperResults>
      questionText: string
    }
> {
  const {
    practiceCode,
    ocrText,
    ocrLines,
    pageOcrResults,
    userQuestionText,
    onProgress,
  } = params

  const script = await segmentPracticeScript(
    ocrText,
    userQuestionText,
    practiceCode
  )

  let questions = ensureQuestionTexts(script.questions, userQuestionText)

  if (questions.length === 0) {
    if (userQuestionText.trim().length >= 10) {
      questions = [
        {
          question_number: '1',
          question_text: userQuestionText.trim(),
          answer_text: ocrText,
        },
      ]
    } else {
      throw new Error(
        'We could not read the question on your pages. Add it below — photo or typed — then try again.'
      )
    }
  }

  if (practiceQuestionsNeedUserInput(questions)) {
    throw new Error(
      'We could not read the question on your pages. Add it below — photo or typed — then try again.'
    )
  }

  const markingMode: MarkingMode = 'general_criteria_practice'
  const paperCode = `${practiceCode}/00`
  const pageSources = pageOcrResults
    .filter((p) => p.photo_url)
    .map((p) => ({ photo_url: p.photo_url!, ocr_lines: p.lines }))

  if (questions.length === 1) {
    const q = questions[0]
    return {
      kind: 'single',
      questionText: q.question_text,
      answerText: q.answer_text,
      questionNumber: q.question_number,
    }
  }

  const results: QuestionMarkResult[] = []
  const total = questions.length

  for (let i = 0; i < total; i++) {
    const seg = questions[i]
    onProgress?.({
      type: 'progress',
      stage: 'marking',
      percent: 50 + Math.round((i / total) * 35),
    })

    const {
      markingResult,
      lineReferences,
      resolvedTags,
    } = await markSingleQuestion({
      ocrText: seg.answer_text,
      ocrLines,
      questionText: seg.question_text,
      markScheme: null,
      markingMode,
      paperCode,
      questionNumber: seg.question_number,
    })

    const ai = toMarkingAIResult(markingResult)
    const inkPages = buildPerPageInk(ai, pageSources)

    results.push({
      question_number: seg.question_number,
      marks_earned: ai.marks_earned,
      total_marks: ai.total_marks,
      marking_style: 'point_based',
      summary: ai.summary,
      ai_marking: ai,
      mark_scheme_id: null,
      line_references: lineReferences,
      answer_photo_url: pageSources[0]?.photo_url ?? null,
      page_photo_urls: pageSources.map((p) => p.photo_url),
      ink_pages: inkPages.length ? inkPages : undefined,
      status: 'attempted',
      syllabus_tags: resolvedTags.length ? resolvedTags : ai.syllabus_tags,
    })
  }

  const wholePaper = aggregateWholePaperResults(paperCode, undefined, results)
  const questionText = questions
    .map((q) => `Q${q.question_number}: ${q.question_text}`)
    .join('\n\n')

  return { kind: 'multi', wholePaper, questionText }
}
