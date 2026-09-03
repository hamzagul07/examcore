/**
 * A real past-paper question for someone who arrived with nothing.
 *
 * Measured over 30 days: 1,300 sessions opened /mark and 93 typed a character.
 * 1,207 people reached the marking page and wrote nothing — the largest single
 * leak in the product. The page asks a visitor to bring a question, an answer
 * and the patience to wait, and someone who arrived from "9709 grade
 * boundaries" has none of the three. The read-only worked example is the only
 * thing offered to them today, and it is opened by 16 of 1,300.
 *
 * So hand them a question. `mark_schemes` holds thousands with their text and
 * their totals, and the marking path for a banked question is the one that
 * already works: the paper reference resolves the official scheme, and the
 * total comes from the row rather than being read off an image — which is the
 * commonest way a mark fails.
 *
 * The decisions live here, pure and tested; the query is a thin wrapper.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cambridge Maths. It has 800 usable starters against 381 for the next subject,
 * and it is the most-visited Cambridge surface on the site — so a visitor with
 * no subject chosen is most likely to recognise it.
 */
export const STARTER_FALLBACK_SUBJECT = '9709'

/**
 * Small enough to attempt in a couple of minutes, big enough to earn real ink.
 * Matches findQuestionForTopic's window so a starter and a topic drill feel
 * like the same size of task.
 */
export const STARTER_MIN_MARKS = 2
export const STARTER_MAX_MARKS = 10

/** Below this the "question" is a fragment and there is nothing to answer. */
export const STARTER_MIN_QUESTION_CHARS = 80

/** How many candidates to draw from before picking one at random. */
export const STARTER_CANDIDATE_POOL = 50

export type StarterQuestion = {
  paperCode: string
  paperSession: string
  questionNumber: string
  questionText: string
  totalMarks: number
}

type StarterRow = {
  paper_code?: string | null
  paper_session?: string | null
  question_number?: string | null
  question_text?: string | null
  total_marks?: number | null
}

/**
 * True for a whole question ("4"), false for a part of one ("4(a)", "2(b)").
 *
 * This is the difference between a starter that can be answered and one that
 * cannot, and it is structural rather than a guess about the text: a part
 * inherits its setup from a stem that is stored on a different row, so handing
 * one over alone gives the student something unanswerable. The bank is full of
 * them — "Calculate the probability that the number of computers donated during
 * a 4-week period is more than 6", "test the factory owner's claim" — each
 * referring to a stem that is nowhere on screen. Filtering on the text cannot
 * catch those reliably; filtering on the number cannot miss them.
 *
 * It costs most of the bank: 2,816 rows sit in the mark window, and 216 are
 * whole questions. A first experience that works is worth more than a large
 * pool of ones that do not.
 */
export function isWholeQuestionNumber(n: string | null | undefined): boolean {
  return /^[0-9]{1,2}$/.test(n?.trim() ?? '')
}

/**
 * True when a row can actually be handed to a student.
 *
 * Every field is required: without the paper reference the official scheme
 * cannot be found, and without the text there is no question on screen to
 * answer. A row that fails this is skipped rather than repaired.
 */
export function isUsableStarter(row: StarterRow | null | undefined): boolean {
  if (!row) return false
  if (!row.paper_code?.trim()) return false
  if (!row.paper_session?.trim()) return false
  if (!isWholeQuestionNumber(row.question_number)) return false
  if ((row.question_text?.trim().length ?? 0) < STARTER_MIN_QUESTION_CHARS) {
    return false
  }
  const marks = row.total_marks
  return (
    typeof marks === 'number' &&
    marks >= STARTER_MIN_MARKS &&
    marks <= STARTER_MAX_MARKS
  )
}

/**
 * Which subject to draw from.
 *
 * A requested subject wins when it looks like a Cambridge syllabus code. IB
 * codes are rejected rather than mapped: IB is marked against criteria and has
 * no banked schemes at all (mark_schemes is 100% Cambridge), so a starter drawn
 * for an IB student would be a question from a different qualification.
 */
export function starterSubject(requested?: string | null): string {
  const code = requested?.trim()
  if (code && /^[0-9]{4}$/.test(code)) return code
  return STARTER_FALLBACK_SUBJECT
}

export function toStarterQuestion(row: StarterRow): StarterQuestion | null {
  if (!isUsableStarter(row)) return null
  return {
    paperCode: row.paper_code!.trim(),
    paperSession: row.paper_session!.trim(),
    questionNumber: row.question_number!.trim(),
    questionText: row.question_text!.trim(),
    totalMarks: row.total_marks as number,
  }
}

/** Pick one usable question at random from a candidate pool. */
export function pickStarter(
  rows: StarterRow[],
  random: () => number = Math.random
): StarterQuestion | null {
  const usable = rows.map(toStarterQuestion).filter((q): q is StarterQuestion => !!q)
  if (usable.length === 0) return null
  const i = Math.min(usable.length - 1, Math.floor(random() * usable.length))
  return usable[i]!
}

/**
 * Read a starter from the scheme bank.
 *
 * A bounded, indexed read with no model call — which is what makes it safe on
 * an unauthenticated route. The topic-question route has to guard its input
 * because an unknown topic there can reach a Gemini call and become an
 * anonymous bill; nothing here can.
 */
export async function findStarterQuestion(
  supabase: SupabaseClient,
  requestedSubject?: string | null
): Promise<StarterQuestion | null> {
  const subject = starterSubject(requestedSubject)
  const { data, error } = await supabase
    .from('mark_schemes')
    .select('paper_code, paper_session, question_number, question_text, total_marks')
    .like('paper_code', `${subject}/%`)
    .gte('total_marks', STARTER_MIN_MARKS)
    .lte('total_marks', STARTER_MAX_MARKS)
    .not('question_text', 'is', null)
    // Whole questions only — see isWholeQuestionNumber. Done in the query as
    // well as the filter so the candidate pool is not spent on parts.
    .not('question_number', 'like', '%(%')
    .order('paper_session', { ascending: false })
    .limit(STARTER_CANDIDATE_POOL)

  if (error) throw new Error(error.message)
  // No cross-subject fallback: a Biology student handed a Maths question is a
  // worse first experience than no offer at all. The caller hides the
  // invitation when nothing comes back.
  return pickStarter((data ?? []) as StarterRow[])
}
