import { GEMINI_PRO_MODEL, generateGeminiText } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'

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
  board: 'Cambridge' | 'IB Diploma'
  questionText: string
  /** The student's answer as OCR'd from their script. */
  studentAnswer: string
  /** The mark scheme JSON the answer was marked against (official/derived), if any. */
  schemeJson: string | null
  /** The final marking result JSON (per-mark earned/missed + reasoning). */
  priorResultJson: string
  totalMarks: number | null
}

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
 * Generate the rewrite. Best-effort: returns null on any model/parse failure so
 * the mark result still renders (the rewrite is a bonus panel, never load-bearing).
 */
export async function generateFullMarksRewrite(
  input: FullMarksRewriteInput
): Promise<FullMarksRewrite | null> {
  try {
    const text = await generateGeminiText(buildFullMarksRewritePrompt(input), {
      task: 'structured-extraction',
      model: GEMINI_PRO_MODEL,
      maxOutputTokens: 2200,
      temperature: 0.2,
    })
    const parsed = extractJSON(text) as Partial<FullMarksRewrite>
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
  } catch (err) {
    console.warn('[mark] full-marks rewrite failed; skipping', err)
    return null
  }
}
