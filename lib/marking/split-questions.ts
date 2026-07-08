/**
 * Multi-question guard.
 *
 * A student can upload a photo/script containing SEVERAL distinct questions. The
 * single-question pipeline would otherwise mash them into one score against one
 * (wrong) total. This splits an OCR'd script into separate questions so each is
 * marked independently.
 *
 * Design: detection is DECOUPLED from answer extraction. Asking one model call to
 * echo back every question stem AND every student's full working overflows the
 * output budget and truncates (only the first question survives). So:
 *   1. detect — list the distinct questions (stem + total only; small output).
 *   2. extract — per question, pull just that question's working (bounded).
 *
 * The hard parts — telling apart sub-parts (a)(b)(c) of ONE question from separate
 * questions, and reading "[Maximum mark: 8]" totals — live in the prompt; the
 * parsers here are pure and unit-tested.
 */

import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { generateGeminiText } from '@/lib/ai/gemini-text'
import {
  extractExplicitTotalMarks,
  extractStatedTotalMarks,
} from '@/lib/marking/question-marks'

/**
 * Plain JSON parse for split responses. We do NOT use lib/marking/json's
 * extractJSON here — its candidate scoring is tuned for marking payloads and
 * mis-picks a nested question object over the outer { questions: [...] } wrapper.
 * The model runs in JSON mode, so the response is already clean JSON.
 */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export type DetectedQuestion = {
  question_number: string
  question_text: string
  total_marks: number | null
}

export type SplitQuestion = DetectedQuestion & {
  answer_text: string
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Pure: parse the detection response into distinct questions (empty ones dropped). */
export function parseDetectedQuestions(raw: unknown): DetectedQuestion[] {
  const obj = raw as Record<string, unknown> | null
  if (!obj || !Array.isArray(obj.questions)) return []
  return (obj.questions as unknown[])
    .map((q, i) => {
      if (!q || typeof q !== 'object') return null
      const qq = q as Record<string, unknown>
      const question_text =
        typeof qq.question_text === 'string' ? qq.question_text.trim() : ''
      if (!question_text) return null
      const question_number =
        typeof qq.question_number === 'string' && qq.question_number.trim()
          ? qq.question_number.trim()
          : String(i + 1)
      return {
        question_number,
        question_text,
        // An EXPLICIT "[Maximum mark: N]" in the text is authoritative; else the
        // detector model's total (it read the full script); else the error-prone
        // per-part sum as a last resort. (Preferring the part-sum over the model
        // caused a 16-mark question to be scored /13 when the stem was partial.)
        total_marks:
          extractExplicitTotalMarks(question_text) ??
          num(qq.total_marks) ??
          extractStatedTotalMarks(question_text),
      }
    })
    .filter((q): q is DetectedQuestion => q !== null)
}

export function buildDetectQuestionsPrompt(
  ocrText: string,
  subjectName: string
): string {
  return `You are triaging a ${subjectName} script for marking. The transcript below may contain ONE exam question or SEVERAL separate questions, each usually followed by the student's working.

TRANSCRIPT:
${ocrText}

List the distinct EXAM QUESTIONS that were posed to the student. Do NOT include the student's working — only the questions themselves.

CRITICAL — what is ONE question vs. several:
- A single question with sub-parts labelled (a), (b), (c) or (i), (ii), (iii) is ONE question. Keep its parts together — do NOT split them into separate items.
- Only create separate items for genuinely DISTINCT questions (e.g. a "[Maximum mark: 8]" question and a separate "[Maximum mark: 16]" question, or two unrelated problems).
- IGNORE the student's own side-notes, formula lists, or personal practice scribbles that are not a posed question. Only list questions actually set for the student.

For each question capture its FULL wording (all sub-parts) and its total marks. The total is usually shown as "[Maximum mark: 8]", "(Total 8 marks)", or the sum of the per-part marks like "[2]", "[3]", "[3]".

Return ONLY JSON:
{
  "questions": [
    { "question_number": "1", "question_text": "full question wording including every sub-part (a)(b)(c)", "total_marks": 8 }
  ]
}

Rules:
- question_text must be usable by an examiner who cannot see the image — include every sub-part and its mark.
- total_marks: the whole question's maximum mark as a number, or null if genuinely not stated.
- Use $...$ for maths.`
}

export function buildAnswerExtractPrompt(
  ocrText: string,
  questionNumber: string,
  questionText: string,
  subjectName: string
): string {
  return `You are preparing ONE question from a ${subjectName} script for marking.

FULL TRANSCRIPT (may contain several questions and the student's working):
${ocrText}

THE QUESTION TO ISOLATE (question ${questionNumber}):
${questionText}

Extract ONLY the student's working/answer for THIS question — every line they wrote towards it, across every sub-part. Do not include the question stem, and do not include working that belongs to a different question.

Return ONLY JSON:
{ "answer_text": "only the student's working for this question" }

Rules:
- If the student wrote nothing for this question, return an empty answer_text.
- Preserve the student's steps faithfully; use $...$ for maths.`
}

async function detectQuestions(
  ocrText: string,
  subjectName: string
): Promise<DetectedQuestion[]> {
  try {
    const text = await generateGeminiText(
      buildDetectQuestionsPrompt(ocrText, subjectName),
      // temperature 0 — detection must be deterministic, or the same script
      // sometimes splits into 2 questions and sometimes merges into 1.
      { task: 'structured-extraction', maxOutputTokens: 3000, temperature: 0 }
    )
    return parseDetectedQuestions(parseJsonObject(text))
  } catch {
    return []
  }
}

async function extractAnswer(
  ocrText: string,
  q: DetectedQuestion,
  subjectName: string
): Promise<string> {
  try {
    const text = await generateGeminiText(
      buildAnswerExtractPrompt(ocrText, q.question_number, q.question_text, subjectName),
      { task: 'structured-extraction', maxOutputTokens: 3000, temperature: 0 }
    )
    const parsed = parseJsonObject(text)
    return typeof parsed?.answer_text === 'string' ? parsed.answer_text.trim() : ''
  } catch {
    return ''
  }
}

/**
 * Detect and split a combined script into distinct questions, each with its own
 * question text, isolated student working, and total. A single-question upload
 * yields one entry (callers treat length <= 1 as "not multi-question").
 */
export async function splitUploadIntoQuestions(
  ocrText: string,
  subjectCode: string
): Promise<SplitQuestion[]> {
  if (!ocrText || ocrText.trim().length < 20) return []
  const subjectName = SUBJECT_CODE_MAP[subjectCode] || 'A-Level'

  const detected = await detectQuestions(ocrText, subjectName)
  if (detected.length === 0) return []
  // Single question: let the normal single-question path handle it (no extra call).
  if (detected.length === 1) {
    return [{ ...detected[0], answer_text: '' }]
  }

  // Multiple questions: isolate each one's working in parallel.
  const answers = await Promise.all(
    detected.map((q) => extractAnswer(ocrText, q, subjectName))
  )
  return detected.map((q, i) => ({ ...q, answer_text: answers[i] }))
}
