import { SUBJECT_CODE_MAP } from '@/lib/profile-options'
import { extractJSON } from '@/lib/marking/json'
import { buildPracticeQuestionExtractPrompt } from '@/lib/marking/prompts'
import { withAnthropicRetry } from '@/lib/marking/gemini-retry'
import { anthropic } from '@/lib/marking/mark-runner'

export type PracticeQuestionExtract = {
  question_found: boolean
  question_text: string
  answer_text: string
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
 */
export async function extractPracticeQuestionFromScript(
  ocrText: string,
  subjectCode: string
): Promise<PracticeQuestionExtract> {
  const subjectName = SUBJECT_CODE_MAP[subjectCode] || 'A-Level'
  const response = await withAnthropicRetry(
    () =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: buildPracticeQuestionExtractPrompt(
              ocrText,
              subjectName,
              subjectCode
            ),
          },
        ],
      }),
    { label: 'claude-practice-question-extract' }
  )
  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parsePracticeQuestionExtract(text)
  if (!parsed) {
    return { question_found: false, question_text: '', answer_text: ocrText }
  }
  if (!parsed.answer_text) {
    parsed.answer_text = ocrText
  }
  return parsed
}
