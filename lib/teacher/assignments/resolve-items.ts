/**
 * Turning what a teacher picked into assignment_items rows
 * (docs/TEACHER_SYSTEM_SPEC.md §2.5 resolveItems; CONTRACTS ruling 4).
 *
 *   past_paper_question → the banked question, by paper, session and number
 *                         (exact first, then the normalised number, as
 *                         findMarkSchemeRow does); mark_scheme_id is ALWAYS
 *                         stored, because reconciliation keys on it
 *   whole_paper         → a paper the bank holds a scheme for; its total is the
 *                         sum of its questions
 *   prompt              → the teacher's own words, as written
 *   topic               → `per_topic` banked questions tagged with the topic
 *                         (walking up the syllabus — 5.4.4 → 5.4 → 5 — only
 *                         when the leaf itself has none), newest papers first,
 *                         spread across papers, never repeating a question
 *                         already in the set; each row keeps topic_code
 *
 * Every question must belong to the set's subject (the paper code's prefix):
 * a Chemistry class cannot be handed a Maths paper by a slip of the picker,
 * and the class analytics would drop the marks anyway.
 *
 * Reads only the columns below — never the mark scheme itself. The I/O sits
 * behind ResolveDeps so the rules are tested without a database.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import { topicLookupCodes } from '@/lib/marking/topic-question'
import { getSyllabusTree, hasSyllabusTree } from '@/lib/syllabi'
import type { AssignmentItem, ItemInput } from '@/lib/teacher/types'
import { DEFAULT_PER_TOPIC, MAX_ITEMS } from '@/lib/teacher/assignments/validate'

/** A banked question as the composer and the resolver see it: no scheme text. */
export type BankQuestion = {
  id: string
  paper_code: string
  paper_session: string
  question_number: string
  total_marks: number | null
  syllabus_tags: string[] | null
}

export const BANK_QUESTION_COLUMNS = 'id, paper_code, paper_session, question_number, total_marks, syllabus_tags'

export type ResolvedItem = Omit<AssignmentItem, 'id' | 'assignment_id'>

/**
 * A request the assignment code refuses, with the answer the route sends:
 * `status {error, field}` — 400 for what the teacher picked, 404 for a
 * student or set that is not theirs to touch, 409 for the wrong state (a
 * published set's items, an archived class), 429 for a throttle (with
 * `retryAfterSeconds` for the Retry-After header).
 */
export class AssignmentInputError extends Error {
  readonly field: string
  readonly status: 400 | 404 | 409 | 429
  readonly retryAfterSeconds: number | null
  constructor(
    message: string,
    field: string,
    status: 400 | 404 | 409 | 429 = 400,
    retryAfterSeconds: number | null = null
  ) {
    super(message)
    this.name = 'AssignmentInputError'
    this.field = field
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export type ResolveDeps = {
  /** The banked question, or null. */
  findQuestion(paperCode: string, paperSession: string, questionNumber: string): Promise<BankQuestion | null>
  /** Every banked question of one paper (empty when the bank has none). */
  paperQuestions(paperCode: string, paperSession: string): Promise<BankQuestion[]>
  /** Banked questions of the subject tagged with `topicCode` (at most `limit`). */
  topicQuestions(subjectCode: string, topicCode: string, limit: number): Promise<BankQuestion[]>
}

/** Questions a topic lookup reads before choosing; plenty to spread over papers. */
export const TOPIC_CANDIDATES = 60

function paperSubject(paperCode: string): string {
  return paperCode.split('/')[0]?.trim() ?? ''
}

function ref(q: { paper_code: string; paper_session: string; question_number?: string | null }): string {
  return [q.paper_code, q.paper_session, q.question_number ? `Q${q.question_number}` : null].filter(Boolean).join(' ')
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function sessionYear(session: string): number {
  return normalizePaperSession(session).year ?? 0
}

/**
 * The syllabus codes to try for a topic, most specific first, or null when
 * the subject has a syllabus tree and the code is not in it (a typo, or a
 * code from another subject). Subjects without a tree accept any code.
 */
export function topicCodesFor(subjectCode: string, topicCode: string): string[] | null {
  const codes = topicLookupCodes(topicCode)
  if (codes.length === 0) return null
  if (!hasSyllabusTree(subjectCode)) return codes
  const known = new Set<string>()
  for (const group of getSyllabusTree(subjectCode) ?? []) {
    known.add(group.parent.code)
    for (const leaf of group.leaves) known.add(leaf.code)
  }
  return known.has(codes[0]) ? codes : null
}

/**
 * `n` questions from a topic's candidates: newest session first, one per
 * paper before any paper gives a second, skipping `exclude`d scheme ids and
 * duplicate numbers. Deterministic for the same candidates.
 */
export function pickTopicQuestions(
  candidates: readonly BankQuestion[],
  n: number,
  exclude: ReadonlySet<string>
): BankQuestion[] {
  const fresh = candidates
    .filter((q) => !exclude.has(q.id))
    .sort(
      (a, b) =>
        sessionYear(b.paper_session) - sessionYear(a.paper_session) ||
        b.paper_session.localeCompare(a.paper_session) ||
        a.paper_code.localeCompare(b.paper_code) ||
        normalizeQuestionNumber(a.question_number).localeCompare(normalizeQuestionNumber(b.question_number), undefined, {
          numeric: true,
        }) ||
        a.id.localeCompare(b.id)
    )
  const picked: BankQuestion[] = []
  const usedPapers = new Set<string>()
  const usedIds = new Set<string>()
  // First pass: one question per paper; second: fill from what is left.
  for (const pass of [0, 1]) {
    for (const q of fresh) {
      if (picked.length >= n) break
      if (usedIds.has(q.id)) continue
      const paper = `${q.paper_code}|${q.paper_session}`
      if (pass === 0 && usedPapers.has(paper)) continue
      picked.push(q)
      usedIds.add(q.id)
      usedPapers.add(paper)
    }
  }
  return picked
}

function questionRow(q: BankQuestion, position: number, topicCode: string | null): ResolvedItem {
  return {
    position,
    item_type: 'past_paper_question',
    mark_scheme_id: q.id,
    paper_code: q.paper_code,
    paper_session: q.paper_session,
    question_number: q.question_number,
    total_marks: num(q.total_marks),
    syllabus_tags: Array.isArray(q.syllabus_tags) ? q.syllabus_tags.filter((t) => typeof t === 'string') : null,
    topic_code: topicCode,
    prompt_text: null,
    ib_component_key: null,
  }
}

/**
 * The rows for `items`, in order, positions 0..n-1. Throws
 * AssignmentInputError naming the offending item (`items.<i>`) for anything
 * the bank cannot supply, a question from another subject, a repeat, or more
 * than MAX_ITEMS rows.
 */
export async function resolveItemsWith(
  deps: ResolveDeps,
  subjectCode: string,
  items: readonly ItemInput[]
): Promise<ResolvedItem[]> {
  const out: ResolvedItem[] = []
  const usedSchemes = new Set<string>()
  const usedPapers = new Set<string>()
  const subject = subjectCode.trim()

  const push = (row: ResolvedItem, field: string) => {
    if (out.length >= MAX_ITEMS) {
      throw new AssignmentInputError(`A set can hold at most ${MAX_ITEMS} questions.`, field)
    }
    out.push(row)
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const field = `items.${i}`

    if (item.item_type === 'past_paper_question' || item.item_type === 'whole_paper') {
      if (paperSubject(item.paper_code) !== subject) {
        throw new AssignmentInputError(`${item.paper_code} is not a paper for this class’s subject.`, field)
      }
    }

    switch (item.item_type) {
      case 'past_paper_question': {
        const q = await deps.findQuestion(item.paper_code, item.paper_session, item.question_number)
        if (!q) {
          throw new AssignmentInputError(`We don’t hold a mark scheme for ${ref(item)}.`, field)
        }
        if (usedSchemes.has(q.id)) {
          throw new AssignmentInputError(`${ref(q)} is already in this set.`, field)
        }
        usedSchemes.add(q.id)
        push(questionRow(q, out.length, null), field)
        break
      }
      case 'whole_paper': {
        const questions = await deps.paperQuestions(item.paper_code, item.paper_session)
        if (questions.length === 0) {
          throw new AssignmentInputError(`We don’t hold a mark scheme for ${ref(item)}.`, field)
        }
        const paper = questions[0]
        const key = `${paper.paper_code}|${paper.paper_session}`
        if (usedPapers.has(key)) throw new AssignmentInputError(`${ref(paper)} is already in this set.`, field)
        usedPapers.add(key)
        const totals = questions.map((q) => num(q.total_marks))
        const total = totals.every((t): t is number => t !== null) ? totals.reduce((a, b) => a + b, 0) : null
        push(
          {
            position: out.length,
            item_type: 'whole_paper',
            mark_scheme_id: null,
            paper_code: paper.paper_code,
            paper_session: paper.paper_session,
            question_number: null,
            total_marks: total !== null && total > 0 ? total : null,
            syllabus_tags: null,
            topic_code: null,
            prompt_text: null,
            ib_component_key: null,
          },
          field
        )
        break
      }
      case 'prompt': {
        push(
          {
            position: out.length,
            item_type: 'prompt',
            mark_scheme_id: null,
            paper_code: null,
            paper_session: null,
            question_number: null,
            total_marks: item.total_marks ?? null,
            syllabus_tags: null,
            topic_code: null,
            prompt_text: item.prompt_text,
            ib_component_key: item.ib_component_key ?? null,
          },
          field
        )
        break
      }
      case 'topic': {
        const codes = topicCodesFor(subject, item.topic_code)
        if (!codes) {
          throw new AssignmentInputError(`${item.topic_code} is not a topic in this class’s syllabus.`, field)
        }
        const want = item.per_topic ?? DEFAULT_PER_TOPIC
        const picked: BankQuestion[] = []
        const taken = new Set(usedSchemes)
        // The leaf first; walk up (5.4.4 → 5.4 → 5) only for what it cannot supply.
        for (const code of codes) {
          if (picked.length >= want) break
          const candidates = (await deps.topicQuestions(subject, code, TOPIC_CANDIDATES)).filter(
            (q) => paperSubject(q.paper_code) === subject
          )
          for (const q of pickTopicQuestions(candidates, want - picked.length, taken)) {
            picked.push(q)
            taken.add(q.id)
          }
        }
        if (picked.length === 0) {
          throw new AssignmentInputError(
            `No banked questions are tagged with ${item.topic_code} yet — set a written prompt instead.`,
            field
          )
        }
        for (const q of picked) {
          usedSchemes.add(q.id)
          push(questionRow(q, out.length, item.topic_code), field)
        }
        break
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// The real reads (service client, after the caller proved it is a teacher)
// ---------------------------------------------------------------------------

type BankRow = Omit<BankQuestion, 'total_marks'> & { total_marks: number | string | null }

function toBankQuestion(row: BankRow): BankQuestion {
  return { ...row, total_marks: num(row.total_marks) }
}

/** ResolveDeps over mark_schemes. `db` must be able to read mark_schemes. */
export function resolveDepsFor(db: SupabaseClient): ResolveDeps {
  const paperQuestions = async (paperCode: string, paperSession: string): Promise<BankQuestion[]> => {
    // A paper is tens of rows, far under the 1,000-row page.
    const { data, error } = await db
      .from('mark_schemes')
      .select(BANK_QUESTION_COLUMNS)
      .eq('paper_code', paperCode)
      .eq('paper_session', paperSession)
      .order('id')
      .limit(500)
    if (error) throw new Error(`mark_schemes: ${error.message}`)
    return ((data ?? []) as BankRow[]).map(toBankQuestion)
  }
  return {
    paperQuestions,
    async findQuestion(paperCode, paperSession, questionNumber) {
      const trimmed = questionNumber.trim()
      if (!trimmed) return null
      const { data: exact, error } = await db
        .from('mark_schemes')
        .select(BANK_QUESTION_COLUMNS)
        .eq('paper_code', paperCode)
        .eq('paper_session', paperSession)
        .eq('question_number', trimmed)
        .order('id')
        .limit(1)
      if (error) throw new Error(`mark_schemes: ${error.message}`)
      if (exact?.[0]) return toBankQuestion(exact[0] as BankRow)
      const rows = await paperQuestions(paperCode, paperSession)
      const target = normalizeQuestionNumber(trimmed)
      return rows.find((r) => normalizeQuestionNumber(r.question_number) === target) ?? null
    },
    async topicQuestions(subjectCode, topicCode, limit) {
      const { data, error } = await db
        .from('mark_schemes')
        .select(BANK_QUESTION_COLUMNS)
        .like('paper_code', `${subjectCode}/%`)
        .contains('syllabus_tags', [topicCode])
        .order('id')
        .limit(limit)
      if (error) throw new Error(`mark_schemes: ${error.message}`)
      return ((data ?? []) as BankRow[]).map(toBankQuestion)
    },
  }
}

/** §2.5 `resolveItems(admin, subjectCode, items)`. */
export async function resolveItems(
  admin: SupabaseClient,
  subjectCode: string,
  items: readonly ItemInput[]
): Promise<ResolvedItem[]> {
  return resolveItemsWith(resolveDepsFor(admin), subjectCode, items)
}

// ---------------------------------------------------------------------------
// Question picker
// ---------------------------------------------------------------------------

export const PREVIEW_MAX = 160

/**
 * The first PREVIEW_MAX characters of a question, on one line, cut at a word
 * boundary with an ellipsis. Enough to recognise a question in the picker;
 * never the mark scheme.
 */
export function questionPreview(text: string | null | undefined, max = PREVIEW_MAX): string | null {
  if (typeof text !== 'string') return null
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return null
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  const head = space > max * 0.6 ? cut.slice(0, space) : cut
  return `${head.replace(/[\s,;:.-]+$/, '')}…`
}
