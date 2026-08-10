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

/**
 * Fixed seed. Measured, and it is NOT sufficient here — read before trusting it.
 *
 * Tested directly against this project's Vertex backend:
 *   flash, thinking off, temperature 1 — seeded 3x identical, unseeded 3x
 *     different. The seed is plumbed through and honoured.
 *   pro, thinking on, temperature 0   — seeded 3x DIFFERENT (281/305/282
 *     chars). Same prompt, same seed, three answers.
 *
 * 2.5 Pro cannot turn thinking off (thinkingBudget: 0 is a 400), and thinking
 * is the stochastic part. So a derived scheme is still not reproducible, and
 * the same question can still be marked against different rubrics. Kept
 * because it costs nothing and does work wherever thinking is off, but it does
 * not solve the problem it was added for. Caching derived schemes is the only
 * route left to a stable rubric — see `resolve-derived-scheme.ts` +
 * `derived_mark_schemes` (fingerprint → JSON).
 */
const DERIVE_SCHEME_SEED = 20260728

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
  /**
   * True when we had to heavily reshape the model's points to hit the known
   * total (e.g. pad one point to absorb most of an 18-mark question). Callers
   * should mark against it for this run but MUST NOT cache it.
   */
  unstable?: boolean
}

/**
 * A derived scheme is too distorted to cache when a single point owns more than
 * half the total while there are far fewer points than marks — classic symptom
 * of under-derivation padded into one bloated A1.
 */
export function isUnstableDerivedScheme(
  marks: DerivedMarkPoint[],
  total: number
): boolean {
  if (!(total > 0) || marks.length === 0) return true
  const maxPoint = Math.max(...marks.map((m) => m.marks))
  if (maxPoint > Math.ceil(total / 2) && marks.length < Math.max(3, Math.ceil(total / 3))) {
    return true
  }
  return false
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Force mark points to sum exactly to `knownTotal`. Prefer dropping/shaving
 * trailing 1-mark fluff when over; pad the last point when under. Never changes
 * the known total — callers lock that before derive.
 */
export function adjustMarksToKnownTotal(
  marks: DerivedMarkPoint[],
  knownTotal: number
): DerivedMarkPoint[] {
  if (!(knownTotal > 0 && knownTotal <= 100)) return marks

  const out: DerivedMarkPoint[] = marks
    .map((m) => ({
      ...m,
      marks: Math.max(1, Math.round(Number(m.marks) || 1)),
    }))
    .filter((m) => m.description !== undefined)

  if (out.length === 0) {
    return [
      {
        code: 'M1',
        marks: knownTotal,
        description: 'Award for a complete correct response',
      },
    ]
  }

  const sumOf = () => out.reduce((s, m) => s + m.marks, 0)

  while (sumOf() > knownTotal && out.length > 1) {
    let oneMarkIdx = -1
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].marks === 1) {
        oneMarkIdx = i
        break
      }
    }
    if (oneMarkIdx >= 0 && sumOf() - 1 >= knownTotal) {
      out.splice(oneMarkIdx, 1)
      continue
    }
    const last = out[out.length - 1]
    if (last.marks > 1) {
      last.marks -= 1
    } else {
      out.pop()
    }
  }

  const sum = sumOf()
  if (sum < knownTotal) {
    out[out.length - 1].marks += knownTotal - sum
  } else if (sum > knownTotal) {
    out[0].marks = knownTotal
    out.splice(1)
  }

  return out
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

  let marks: DerivedMarkPoint[] = Array.isArray(obj.marks)
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

  if (knownTotal && knownTotal > 0) {
    marks = adjustMarksToKnownTotal(marks, knownTotal)
  }

  const unstable = isUnstableDerivedScheme(marks, total)

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
    unstable: unstable || undefined,
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

Keep "verification_note" to ONE short sentence. Prefer complete JSON over long notes.

Output valid JSON ONLY, no prose:
{
  "expected_answer": "the correct final answer(s)",
  "verification_note": "brief check",
  "total_marks": ${hasTotal ? totalMarks : 0},
  "marks": [
    { "code": "M1", "marks": 1, "description": "what earns this mark" }
  ]
}`
}

/** Pro thinking draws from the same budget as output — 2048 was truncating
 * mid-JSON so parseDerivedScheme saw no marks and every freeform remake fell
 * back to single-pass (no cache). Match the point-based mark budget. */
const DERIVE_OUTPUT_TOKENS = 10000
const DERIVE_RETRY_OUTPUT_TOKENS = 14000

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
  const prompt = buildDeriveSchemePrompt(params)

  const attempt = async (maxOutputTokens: number): Promise<DeriveResult | null> => {
    const { text } = await generateGeminiTextWithMeta(prompt, {
      task: 'marking',
      model: GEMINI_PRO_MODEL,
      temperature: 0,
      // Intended to stabilise the rubric. It does not, on Pro with thinking
      // — see DERIVE_SCHEME_SEED above for the measurement.
      seed: DERIVE_SCHEME_SEED,
      maxOutputTokens,
    })
    if (!text.trim()) return null
    return parseDerivedScheme(extractJSON(text), params.totalMarks)
  }

  try {
    const first = await attempt(DERIVE_OUTPUT_TOKENS)
    if (first) return first
    // Truncated / empty marks JSON — retry once with more headroom.
    console.warn('[mark] derive-scheme parse empty; retrying with larger budget')
    return await attempt(DERIVE_RETRY_OUTPUT_TOKENS)
  } catch (err) {
    console.warn('[mark] derive-scheme failed; falling back to single-pass', err)
    return null
  }
}
