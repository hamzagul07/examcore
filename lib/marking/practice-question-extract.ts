import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { extractJSON } from '@/lib/marking/json'
import { buildPracticeQuestionExtractPrompt } from '@/lib/marking/prompts'
import { generateGeminiTextWithMeta } from '@/lib/ai/gemini-text'

export type PracticeQuestionExtract = {
  question_found: boolean
  question_text: string
  answer_text: string
  /** The model hit its output cap: whatever answer_text holds is a fragment. */
  truncated?: boolean
}

export function parsePracticeQuestionExtract(raw: string): PracticeQuestionExtract | null {
  try {
    const parsed = extractJSON(raw) as Record<string, unknown>
    if (!parsed) return null
    const question_text =
      typeof parsed.question_text === 'string' ? parsed.question_text.trim() : ''
    const answer_text =
      typeof parsed.answer_text === 'string' ? parsed.answer_text.trim() : ''
    return {
      question_found: parsed.question_found === true,
      question_text,
      answer_text: answer_text || '',
    }
  } catch {
    return null
  }
}

/**
 * When the student only uploads an answer photo, split question wording from
 * their working so marking does not guess the wrong question.
 *
 * The model echoes the answer back inside JSON, so the call has to have room
 * for the whole thing. On 2026-09-24 it did not: with the default dynamic
 * thinking budget, thinking tokens came out of the same 2,000-token cap as
 * the visible output, the model returned 275 characters of JSON cut mid-word
 * inside answer_text, jsonrepair sealed the fragment into a valid object,
 * and a 5,000-character Sociology essay was marked as "a single sentence
 * that rephrases the question" — 1/26, then 0/15, deterministically, for a
 * student on their first day. Copying text needs no reasoning, so thinking
 * is off; the cap now covers a long essay with its JSON escaping; and the
 * result says when it was cut, so chooseAnswerText() can refuse it.
 */
export async function extractPracticeQuestionFromScript(
  ocrText: string,
  subjectCode: string
): Promise<PracticeQuestionExtract> {
  const subjectName = SUBJECT_CODE_MAP[subjectCode] || 'A-Level'
  const { text, finishReason } = await generateGeminiTextWithMeta(
    buildPracticeQuestionExtractPrompt(ocrText, subjectName, subjectCode),
    {
      task: 'structured-extraction',
      maxOutputTokens: 8192,
      temperature: 0,
      thinkingBudget: 0,
    }
  )
  const parsed = parsePracticeQuestionExtract(text)
  if (!parsed) {
    return { question_found: false, question_text: '', answer_text: ocrText }
  }
  parsed.truncated = finishReason === 'MAX_TOKENS'
  if (!parsed.answer_text) {
    parsed.answer_text = ocrText
  }
  return parsed
}

/** Below this share of the transcript, an "extracted answer" is a fragment, not an answer. */
export const ANSWER_KEEP_RATIO = 0.6
/** Transcripts shorter than this are not judged by ratio — a short answer can be most of one. */
export const ANSWER_RATIO_MIN_CHARS = 200

export type AnswerChoice = {
  text: string
  source: 'extracted' | 'transcript'
  reason?: 'truncated' | 'fragment' | 'empty'
}

/**
 * The text the marker should see: the extracted answer when it is plausibly
 * the whole answer, otherwise the transcript with the question lines stripped.
 *
 * The extractor's contract is "the student's working, verbatim", so a result
 * much shorter than the transcript minus the question is a truncation, a
 * summary, or the first line — never a faithful copy. The transcript is the
 * safer input in every one of those cases: at worst the marker also sees the
 * question at the top, which is how every non-combined upload already reads.
 */
export function chooseAnswerText(ocrText: string, extract: PracticeQuestionExtract): AnswerChoice {
  const answer = extract.answer_text.trim()
  const fallback = (reason: AnswerChoice['reason']): AnswerChoice => ({
    text: stripLeadingQuestion(ocrText, extract.question_text),
    source: 'transcript',
    reason,
  })
  if (!answer) return fallback('empty')
  if (extract.truncated) return fallback('truncated')
  const expected = Math.max(0, ocrText.trim().length - extract.question_text.trim().length)
  if (expected >= ANSWER_RATIO_MIN_CHARS && answer.length < expected * ANSWER_KEEP_RATIO) {
    return fallback('fragment')
  }
  return { text: answer, source: 'extracted' }
}

/** Case, punctuation and apostrophes (which OCR drops or garbles) do not count. */
const normalise = (s: string): string =>
  s
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Remove the question from the top of a transcript when the student copied
 * it out before answering. Matched on normalised text across up to eight
 * consecutive lines within the first dozen, so line breaks and punctuation
 * in the OCR do not matter; when the question is paraphrased rather than
 * copied, the transcript is returned untouched.
 */
export function stripLeadingQuestion(ocrText: string, questionText: string): string {
  const q = normalise(questionText)
  if (q.length < 20) return ocrText
  const lines = ocrText.split('\n')
  const head = Math.min(lines.length, 12)
  for (let start = 0; start < head; start++) {
    const first = normalise(lines[start] ?? '')
    if (!first || !q.startsWith(first.slice(0, Math.min(12, first.length)))) continue
    let acc = ''
    for (let end = start; end < Math.min(lines.length, start + 8); end++) {
      acc = normalise(`${acc} ${lines[end] ?? ''}`)
      if (acc.includes(q)) {
        return [...lines.slice(0, start), ...lines.slice(end + 1)].join('\n').replace(/^\s+/, '')
      }
    }
  }
  return ocrText
}
