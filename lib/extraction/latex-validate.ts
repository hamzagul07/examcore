import { extractJSON } from '@/lib/marking/json'
import { generateGeminiText } from '@/lib/ai/gemini-text'

export type LatexValidationResult = {
  passes: boolean
  issues: string[]
  subscriptsOk: boolean
  superscriptsOk: boolean
  specialCharsOk: boolean
}

const VALIDATION_PROMPT = `You are validating extracted question text from a Cambridge A-Level Physics PDF.

The text below was extracted by an LLM. Check whether the LaTeX math notation is faithful to a typical Cambridge exam paper:
- Subscripts preserved (e.g. $v_s$, $T$, $\\theta$)
- Superscripts preserved (e.g. $x^2$, $10^{-3}$)
- Special characters and symbols preserved (Greek letters, units, arrows)
- LaTeX delimiters ($...$ or $$...$$) present around math, not plain text like x^2

Do NOT rewrite or correct the text. Only assess fidelity.

Return ONLY JSON:
{
  "passes": boolean,
  "issues": string[],
  "subscripts_ok": boolean,
  "superscripts_ok": boolean,
  "special_chars_ok": boolean
}`

/**
 * Per-question Gemini Flash validation pass.
 * Does not auto-correct — surfaces issues for manual review.
 */
export async function validateQuestionLatex(
  questionText: string,
  context?: { questionNumber: string; paperLabel?: string }
): Promise<LatexValidationResult> {
  const header = context
    ? `Question ${context.questionNumber}${context.paperLabel ? ` (${context.paperLabel})` : ''}:\n\n`
    : ''

  const raw = await generateGeminiText(`${VALIDATION_PROMPT}\n\n${header}${questionText}`, {
    task: 'latex-validation',
    maxOutputTokens: 800,
    temperature: 0,
  })

  try {
    const parsed = extractJSON(raw) as Record<string, unknown>
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.filter((i): i is string => typeof i === 'string')
      : []

    return {
      passes: parsed.passes === true,
      issues,
      subscriptsOk: parsed.subscripts_ok !== false,
      superscriptsOk: parsed.superscripts_ok !== false,
      specialCharsOk: parsed.special_chars_ok !== false,
    }
  } catch {
    return {
      passes: false,
      issues: ['LaTeX validation response was not valid JSON'],
      subscriptsOk: false,
      superscriptsOk: false,
      specialCharsOk: false,
    }
  }
}
