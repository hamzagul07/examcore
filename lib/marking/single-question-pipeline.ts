import { createClient } from '@supabase/supabase-js'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { buildLineReferences, type OcrLine } from '@/lib/examiner-ink-positioning'
import { extractJSON } from '@/lib/marking/json'
import type {
  MarkContextPayload,
  MarkProgressEvent,
} from '@/lib/marking/mark-progress'
import {
  lookupMarkScheme,
  markSingleQuestion,
  ocrAnswerBufferWithBoxes,
  uploadAnswerPhoto,
  ocrImage,
  questionPhotoOcrPrompt,
} from '@/lib/marking/mark-runner'
import { buildDetectionPrompt } from '@/lib/marking/prompts'
import { reconcileDetectionWithQuestion } from '@/lib/marking/subject-inference'
import { resolveMarkResultSubjectCode } from '@/lib/syllabi/attempts'
import { buildPerPageInk } from '@/lib/marking/ink-per-page'
import { toMarkingAIResult } from '@/lib/marking/whole-paper'
import { extractPracticeQuestionFromScript } from '@/lib/marking/practice-question-extract'
import type { MarkIntent, MarkingMode, MarkSchemeRow } from '@/lib/marking/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type SingleQuestionMarkInput = {
  pageFiles: File[]
  questionPhoto: File | null
  questionTextInput: string
  manualPaperCode: string | null
  manualPaperSession: string | null
  manualQuestionNumber: string | null
  /** When `practice_question`, skips past-paper detection and uses subject conventions. */
  markIntent?: MarkIntent
  practiceSubjectCode?: string | null
  userId: string | null
  startedAt?: number
  onProgress?: (event: MarkProgressEvent) => void
}

function emit(
  onProgress: SingleQuestionMarkInput['onProgress'],
  stage: Extract<MarkProgressEvent, { type: 'progress' }>['stage'],
  percent: number
) {
  onProgress?.({ type: 'progress', stage, percent })
}

function emitContext(
  onProgress: SingleQuestionMarkInput['onProgress'],
  ctx: MarkContextPayload
) {
  onProgress?.({ type: 'context', ...ctx })
}

async function runPaperDetection(
  ocrSnippet: string,
  questionText: string,
  subjectHint?: string
): Promise<Record<string, unknown>> {
  const detectionText = await generateGeminiText(
    buildDetectionPrompt(ocrSnippet, questionText, subjectHint),
    { maxOutputTokens: 500 }
  )
  try {
    return extractJSON(detectionText) as Record<string, unknown>
  } catch {
    return { is_past_paper: false }
  }
}

export async function runSingleQuestionMark(
  input: SingleQuestionMarkInput
): Promise<Record<string, unknown>> {
  const {
    pageFiles,
    questionPhoto,
    questionTextInput,
    manualPaperCode,
    manualPaperSession,
    manualQuestionNumber,
    markIntent = 'past_paper',
    practiceSubjectCode,
    userId,
    startedAt = Date.now(),
    onProgress,
  } = input

  const isPracticeQuestion = markIntent === 'practice_question'
  const practiceCode = practiceSubjectCode?.trim() || null

  const hasManualSelection =
    !isPracticeQuestion &&
    !!(
      manualPaperCode &&
      manualPaperSession &&
      manualQuestionNumber
    )
  const manualSubjectCode = manualPaperCode?.split('/')[0]

  emit(onProgress, 'reading_work', 5)

  const pageOcrResults: Array<{
    full_text: string
    lines: OcrLine[]
    photo_url: string | null
  }> = []

  const ocrOnePage = async (file: File) => {
    const buf = Buffer.from(await file.arrayBuffer())
    const [{ full_text, lines }, photo_url] = await Promise.all([
      ocrAnswerBufferWithBoxes(
        buf,
        file.type || 'image/jpeg',
        manualSubjectCode
      ),
      uploadAnswerPhoto(buf, file.type || 'image/jpeg', userId),
    ])
    return { full_text, lines, photo_url }
  }

  const subjectHint =
    (isPracticeQuestion ? practiceCode : manualSubjectCode)
      ? SUBJECT_CODE_MAP[isPracticeQuestion ? practiceCode! : manualSubjectCode!]
      : undefined

  const first = await ocrOnePage(pageFiles[0])
  pageOcrResults.push(first)

  if (pageFiles.length > 1) {
    const rest = await Promise.all(pageFiles.slice(1).map((f) => ocrOnePage(f)))
    pageOcrResults.push(...rest)
  }

  emit(onProgress, 'reading_work', 20)

  const ocrText = pageOcrResults
    .map((p, i) => `[Page ${i + 1}]\n${p.full_text}`)
    .join('\n\n')
  const ocrLines = pageOcrResults.flatMap((p) => p.lines)
  const answerPhotoUrl = pageOcrResults[0]?.photo_url ?? null
  const pagePhotoUrls = pageOcrResults
    .map((p) => p.photo_url)
    .filter((u): u is string => !!u)

  if (!ocrText || ocrText.trim().length < 5) {
    throw new Error('No handwriting detected. Try a clearer photo.')
  }

  let questionText = questionTextInput.trim()
  if (questionPhoto && !questionText) {
    questionText = await ocrImage(
      questionPhoto,
      questionPhotoOcrPrompt(subjectHint)
    )
  }

  emit(onProgress, 'finding_scheme', 30)

  let markingMode: MarkingMode = 'general_criteria'
  let markScheme: MarkSchemeRow | null = null
  let detectedPaper: Record<string, string> | null = null
  let ocrTextForMarking = ocrText

  if (isPracticeQuestion) {
    if (!practiceCode) {
      throw new Error('Please select a subject for your question.')
    }

    if (!questionText || questionText.trim().length < 10) {
      throw new Error(
        'Add your question — type it or upload a photo — before we can mark your answer.'
      )
    }

    emit(onProgress, 'finding_scheme', 40)
    const extracted = await extractPracticeQuestionFromScript(
      ocrText,
      practiceCode
    )
    if (extracted.answer_text.trim().length >= 5) {
      ocrTextForMarking = extracted.answer_text
    }

    markingMode = 'general_criteria_practice'
    emitContext(onProgress, {
      paper_code: null,
      paper_session: null,
      question_number: null,
      subject_code: practiceCode,
      syllabus_tags: null,
    })
  } else {
  let detection: Record<string, unknown> = { is_past_paper: false }

  if (hasManualSelection) {
    detection = {
      is_past_paper: true,
      confidence: 'high',
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
      question_number: manualQuestionNumber,
      reasoning: 'Manually selected by user',
    }
  } else {
    detection = await runPaperDetection(ocrText, questionText, subjectHint)
    detection = reconcileDetectionWithQuestion(detection, questionText)
  }

  if (
    detection.is_past_paper &&
    detection.paper_code &&
    detection.paper_session &&
    detection.question_number
  ) {
    detectedPaper = {
      paper_code: String(detection.paper_code),
      paper_session: String(detection.paper_session),
      question_number: String(detection.question_number),
    }

    emit(onProgress, 'finding_scheme', 50)

    const lookup = await lookupMarkScheme(
      detectedPaper.paper_code,
      detectedPaper.paper_session,
      detectedPaper.question_number,
      {
        extractionMode: 'targeted',
        onExtracting: () => emit(onProgress, 'extracting_scheme', 70),
      }
    )
    markScheme = lookup.scheme
    markingMode = lookup.mode
    if (!lookup.wasCached && !lookup.scheme) {
      // cold extract attempted but failed — no extra progress stage
    }

    const subjectFromPaper = detectedPaper.paper_code.split('/')[0]
    emitContext(onProgress, {
      paper_code: detectedPaper.paper_code,
      paper_session: detectedPaper.paper_session,
      question_number: detectedPaper.question_number,
      subject_code: subjectFromPaper,
      syllabus_tags: markScheme?.syllabus_tags ?? null,
    })
  } else if (hasManualSelection && manualPaperCode) {
    emitContext(onProgress, {
      paper_code: manualPaperCode,
      paper_session: manualPaperSession,
      question_number: manualQuestionNumber,
      subject_code: manualSubjectCode ?? manualPaperCode.split('/')[0],
      syllabus_tags: null,
    })
  }

  if (
    markingMode === 'general_criteria' &&
    (!questionText || questionText.trim().length < 10)
  ) {
    throw new Error(
      'We could not identify this as a past paper question. Please also upload a photo of the question, or type the question text below.'
    )
  }
  }

  emit(onProgress, 'marking', 85)

  const {
    markingResult,
    lineReferences,
    errorClassifications,
    resolvedTags,
    markingMode: finalMode,
  } = await markSingleQuestion({
    ocrText: ocrTextForMarking,
    ocrLines,
    questionText,
    markScheme,
    markingMode,
    paperCode: isPracticeQuestion
      ? `${practiceCode}/00`
      : detectedPaper?.paper_code,
    paperSession: detectedPaper?.paper_session,
    questionNumber: detectedPaper?.question_number,
  })

  if (resolvedTags.length > 0 || detectedPaper || hasManualSelection) {
    emitContext(onProgress, {
      paper_code: detectedPaper?.paper_code ?? manualPaperCode,
      paper_session: detectedPaper?.paper_session ?? manualPaperSession,
      question_number:
        detectedPaper?.question_number ?? manualQuestionNumber,
      subject_code:
        (detectedPaper?.paper_code ?? manualPaperCode)?.split('/')[0] ??
        null,
      syllabus_tags: resolvedTags.length ? resolvedTags : null,
    })
  }

  const timeSpentSeconds = Math.max(
    1,
    Math.round((Date.now() - startedAt) / 1000)
  )

  const { data: attempt } = await supabaseAdmin
    .from('attempts')
    .insert({
      mark_scheme_id: markScheme?.id || null,
      source_type: finalMode === 'official_mark_scheme' ? 'past_paper' : 'other',
      user_id: userId,
      question_text: questionText || (markScheme?.question_text ?? null),
      ocr_text: ocrText,
      ai_marking: markingResult,
      marks_earned: markingResult.marks_earned,
      total_marks: markingResult.total_marks,
      syllabus_tags: resolvedTags,
      time_spent_seconds: timeSpentSeconds,
      answer_photo_url: answerPhotoUrl,
      error_classifications: errorClassifications,
      line_references: lineReferences,
    })
    .select()
    .single()

  const paperCodeForSubject = isPracticeQuestion
    ? `${practiceCode}/00`
    : detectedPaper?.paper_code ?? markScheme?.paper_code ?? null
  const subject_code = resolveMarkResultSubjectCode({
    paper_code: paperCodeForSubject,
    subject_code: isPracticeQuestion ? practiceCode : undefined,
    syllabus_tags: resolvedTags,
  })

  const aiResult = toMarkingAIResult(markingResult)
  const inkPages = buildPerPageInk(
    aiResult,
    pageOcrResults
      .filter((p) => p.photo_url)
      .map((p) => ({ photo_url: p.photo_url!, ocr_lines: p.lines }))
  )

  return {
    marks_earned: markingResult.marks_earned,
    total_marks: markingResult.total_marks,
    ai_marking: markingResult,
    ocr_text: ocrText,
    question_text: questionText || markScheme?.question_text || null,
    marking_mode: finalMode,
    detected_paper: detectedPaper,
    subject_code,
    attempt_id: attempt?.id,
    syllabus_tags: resolvedTags,
    answer_photo_url: answerPhotoUrl,
    page_photo_urls: pagePhotoUrls.length ? pagePhotoUrls : undefined,
    line_references: lineReferences,
    ink_pages: inkPages.length ? inkPages : undefined,
    error_classifications: errorClassifications,
    upload_mode: 'single_question',
  }
}
