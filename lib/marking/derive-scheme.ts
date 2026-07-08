/**
 * Derive-then-mark: produce the mark scheme for a question BEFORE the student's
 * answer is marked against it.
 *
 * Most IB questions have no stored per-question mark scheme (the ib_points_scheme
 * table is essentially empty). Rather than let the marking model invent a scheme
 * and mark against it in a single conflated pass, we split the two:
 *
 *   1. DERIVE — given the question + the subject's marking conventions + the
 *      total, the model works out the correct answer and breaks the total into
 *      method/accuracy/reasoning marks. It self-checks its own answer.
 *   2. MARK  — the derived scheme is fed into the normal point-based marking
 *      prompt; the student is marked against it (with ECF / alternative methods).
 *
 * This is where the model's reasoning ("common sense") is used — but boxed in by
 * the conventions and the fixed total we supply. The parse/normalise step here is
 * pure and unit-tested; the network call is a thin wrapper around it.
 */

import { generateGeminiTextWithMeta, GEMINI_PRO_MODEL } from '@/lib/ai/gemini-text'
import { extractJSON } from '@/lib/marking/json'

export type DerivedMarkPoint = {
  code: string
  marks: number
  description: string
}

export type DerivedMarkScheme = {
  type: 'point_based'
  total_marks: number
  expected_answer?: string
  verification_note?: string
  marks: DerivedMarkPoint[]
}

export type DeriveResult = {
  scheme: DerivedMarkScheme
  /** The denominator this derivation settled on (known total wins over the model's). */
  total: number
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Pure: turn a raw derive response into a normalised scheme, or null if it has no
 * usable mark points. `knownTotal` (student-supplied or read from the question)
 * always wins as the denominator so the mark pass and reconciler stay consistent.
 */
export function parseDerivedScheme(
  raw: unknown,
  knownTotal: number | null
): DeriveResult | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const marks: DerivedMarkPoint[] = Array.isArray(obj.marks)
    ? (obj.marks as unknown[])
        .map((m) => {
          if (!m || typeof m !== 'object') return null
          const mm = m as Record<string, unknown>
          const marksValue = num(mm.marks) ?? 1
          const code =
            typeof mm.code === 'string' && mm.code.trim()
              ? mm.code.trim()
              : 'M1'
          const description =
            typeof mm.description === 'string' ? mm.description : ''
          return { code, marks: Math.max(0, marksValue), description }
        })
        .filter((m): m is DerivedMarkPoint => m !== null)
    : []

  if (marks.length === 0) return null

  const derivedSum = marks.reduce((s, m) => s + m.marks, 0)
  const modelTotal = num(obj.total_marks)
  // Denominator priority: a known total (from question/user) > the model's stated
  // total > the sum of the mark points it wrote. The sum is the safest fallback.
  const total =
    (knownTotal && knownTotal > 0 && knownTotal) ||
    (modelTotal && modelTotal > 0 && modelTotal) ||
    derivedSum

  return {
    scheme: {
      type: 'point_based',
      total_marks: total,
      expected_answer:
        typeof obj.expected_answer === 'string' ? obj.expected_answer : undefined,
      verification_note:
        typeof obj.verification_note === 'string'
          ? obj.verification_note
          : undefined,
      marks,
    },
    total,
  }
}

export function buildDeriveSchemePrompt(params: {
  subjectName: string
  board: string
  questionText: string
  totalMarks: number | null
  mathConventions: boolean
}): string {
  const { subjectName, board, questionText, totalMarks, mathConventions } = params
  const hasTotal = typeof totalMarks === 'number' && totalMarks > 0
  const totalLine = hasTotal
    ? `This question is worth EXACTLY ${totalMarks} marks — your mark points must sum to ${totalMarks}.`
    : `Read the total marks from the question itself (usually shown as "[3]" or "(Total 8 marks)") and set "total_marks" to it; your mark points must sum to that number.`

  const mathBlock = mathConventions
    ? `\nApply IB mathematics conventions: M marks for a valid METHOD (award even if a later slip occurs), A marks for a correct ANSWER/accuracy, R/AG for reasoning or a given "show that" result. Follow through (ECF) on an earlier error. Accept any mathematically valid method that reaches the answer — do not assume one canonical method.\n`
    : `\nAward method marks for correct approach and accuracy marks for correct results, following this subject's standard analytic conventions. Accept equivalent correct approaches.\n`

  return `You are a ${board} ${subjectName} senior examiner. BEFORE seeing any student answer, produce the mark scheme for the question below.

Work like setting an official scheme:
1. Solve the question yourself and state the correct final answer.
2. VERIFY your answer: re-derive or sanity-check it a second way; if the two disagree, fix it before continuing.
3. Break the total marks into discrete mark points, each with a code (M1, A1, R1, ...) and what earns it.
${mathBlock}
${totalLine}

QUESTION:
${questionText}

Output valid JSON ONLY, no prose:
{
  "expected_answer": "the correct final answer(s)",
  "verification_note": "how you double-checked the answer",
  "total_marks": ${hasTotal ? totalMarks : 0},
  "marks": [
    { "code": "M1", "marks": 1, "description": "what earns this mark" }
  ]
}`
}

/**
 * Derive a mark scheme for a single question. Returns null on any failure so the
 * caller falls back to the existing single-pass marking.
 */
export async function deriveMarkScheme(params: {
  subjectName: string
  board: string
  questionText: string
  totalMarks: number | null
  mathConventions: boolean
}): Promise<DeriveResult | null> {
  if (!params.questionText || params.questionText.trim().length < 8) return null
  try {
    const { text } = await generateGeminiTextWithMeta(
      buildDeriveSchemePrompt(params),
      {
        task: 'marking',
        model: GEMINI_PRO_MODEL,
        temperature: 0,
        maxOutputTokens: 2048,
      }
    )
    if (!text.trim()) return null
    return parseDerivedScheme(extractJSON(text), params.totalMarks)
  } catch (err) {
    console.warn('[mark] derive-scheme failed; falling back to single-pass', err)
    return null
  }
}
