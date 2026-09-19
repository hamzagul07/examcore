import { GEMINI_PRO_MODEL, generateGeminiTextWithMeta } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'
import type { MarkingBoardLabel } from '@/lib/marking/exam-board'

/**
 * Rewrite-to-full-marks (premium): an examiner-style rewrite of the student's
 * OWN answer into a response that would score full marks, with each material
 * addition/change annotated with the mark it earns. Not a fresh model answer —
 * it keeps the student's correct working and shows the delta to top marks, so
 * they see exactly what to add next time.
 */
export type FullMarksRewrite = {
  /** The rewritten, full-marks version of the student's answer (rich text). */
  rewritten_answer: string
  /** Each addition/change and the mark (or band lift) it earns. */
  annotations: Array<{ text: string; earns: string }>
}

export type FullMarksRewriteInput = {
  subjectName: string
  board: MarkingBoardLabel
  questionText: string
  /** The student's answer as OCR'd from their script. */
  studentAnswer: string
  /** The mark scheme JSON the answer was marked against (official/derived), if any. */
  schemeJson: string | null
  /** The final marking result JSON (per-mark earned/missed + reasoning). */
  priorResultJson: string
  totalMarks: number | null
}

/**
 * Token budgets, tried in order.
 *
 * Gemini 2.5 Pro draws its thinking from the SAME allowance as the visible
 * answer, and thinking cannot be switched off on Pro (a zero budget is a 400).
 * Under the previous single 2200-token cap with dynamic thinking, the model
 * routinely spent ~2000 tokens deciding what to write and was cut off ~90
 * tokens into writing it. `jsonrepair` then closed the broken string, so an
 * answer that stopped mid-sentence with no annotations was stored — and shown
 * to the student as "this would score full marks". Every rewrite generated in
 * the 60 days before this change was truncated that way.
 *
 * A bounded thinking budget keeps the reasoning from eating the answer; the
 * output cap leaves real room for a long essay rewrite plus annotations; and a
 * MAX_TOKENS finish is retried once, then dropped rather than half-shown.
 */
const REWRITE_THINKING_BUDGET = 2048
const REWRITE_OUTPUT_BUDGETS = [8000, 16000] as const

function buildFullMarksRewritePrompt(input: FullMarksRewriteInput): string {
  const {
    subjectName,
    board,
    questionText,
    studentAnswer,
    schemeJson,
    priorResultJson,
    totalMarks,
  } = input

  return [
    `You are a senior ${board} examiner for ${subjectName}. A student has just had their answer marked. Your job is to show them how to turn THEIR answer into a full-marks response.`,
    '',
    'QUESTION:',
    questionText || '(not provided)',
    '',
    totalMarks ? `TOTAL MARKS: ${totalMarks}` : '',
    '',
    "STUDENT'S ANSWER (verbatim from their script):",
    studentAnswer,
    '',
    schemeJson ? `MARK SCHEME (authoritative — award only what this credits):\n${schemeJson}` : '',
    '',
    'HOW IT WAS MARKED (which marks were earned vs missed, and why):',
    priorResultJson,
    '',
    'INSTRUCTIONS:',
    "- Rewrite the student's answer so it would score FULL marks. Preserve the parts they got right (keep their correct working, method, and phrasing where it already earns credit) and add or correct only what is needed to earn the marks they missed.",
    '- Do NOT invent facts the question does not support, and do NOT pad. Stay at the length a real full-marks answer needs — examiners reward precision, not volume.',
    '- Match the conventions of the subject (e.g. show M/A working for maths; use command-word-appropriate evaluation for essays).',
    "- For EACH material addition or correction versus the student's original, record a short annotation naming exactly what it earns (a mark code like 'A1', a scheme point, or a band lift).",
    '',
    'Return ONLY valid JSON, no prose, in exactly this shape:',
    '{',
    '  "rewritten_answer": "the full-marks version of THEIR answer, as a string (use \\n for line breaks; you may use $...$ for maths)",',
    '  "annotations": [ { "text": "what you added/changed", "earns": "the mark or band it earns" } ]',
    '}',
  ]
    .filter(Boolean)
    .join('\n')
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/**
 * Parse a model reply into a rewrite. Pure, so the truncation rule is testable:
 * a MAX_TOKENS finish is never a rewrite, however salvageable its JSON looks,
 * because what got cut off is the end of the answer the student is told to copy.
 */
export function parseFullMarksRewrite(
  text: string,
  finishReason?: string
): FullMarksRewrite | null {
  if (finishReason === 'MAX_TOKENS') return null
  if (!text.trim()) return null

  let parsed: Partial<FullMarksRewrite> | null
  try {
    parsed = extractJSON(text) as Partial<FullMarksRewrite> | null
  } catch {
    return null
  }
  if (!parsed || !isNonEmptyString(parsed.rewritten_answer)) return null

  const annotations = Array.isArray(parsed.annotations)
    ? parsed.annotations
        .filter(
          (a): a is { text: string; earns: string } =>
            !!a && isNonEmptyString(a.text) && isNonEmptyString(a.earns)
        )
        .map((a) => ({ text: a.text.trim(), earns: a.earns.trim() }))
        .slice(0, 20)
    : []

  return { rewritten_answer: parsed.rewritten_answer.trim(), annotations }
}

/**
 * Generate the rewrite. Best-effort: returns null on any model/parse failure so
 * the mark result still renders (the rewrite is a bonus panel, never load-bearing).
 */
export async function generateFullMarksRewrite(
  input: FullMarksRewriteInput
): Promise<FullMarksRewrite | null> {
  try {
    const prompt = buildFullMarksRewritePrompt(input)
    for (let attempt = 0; attempt < REWRITE_OUTPUT_BUDGETS.length; attempt++) {
      const maxOutputTokens = REWRITE_OUTPUT_BUDGETS[attempt]
      const { text, finishReason } = await generateGeminiTextWithMeta(prompt, {
        task: 'structured-extraction',
        model: GEMINI_PRO_MODEL,
        maxOutputTokens,
        thinkingBudget: REWRITE_THINKING_BUDGET,
        temperature: 0.2,
      })

      const hasMoreBudget = attempt < REWRITE_OUTPUT_BUDGETS.length - 1
      if (finishReason === 'MAX_TOKENS' && hasMoreBudget) {
        console.warn('[mark] full-marks rewrite truncated; retrying with larger budget', {
          budget: maxOutputTokens,
          chars: text.length,
        })
        continue
      }

      const rewrite = parseFullMarksRewrite(text, finishReason)
      if (!rewrite) {
        console.warn('[mark] full-marks rewrite unusable; skipping', {
          finishReason,
          budget: maxOutputTokens,
          chars: text.length,
        })
      }
      return rewrite
    }
    return null
  } catch (err) {
    console.warn('[mark] full-marks rewrite failed; skipping', err)
    return null
  }
}
