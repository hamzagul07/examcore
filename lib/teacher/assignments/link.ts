/**
 * How a student's mark reaches their teacher's set (docs/TEACHER_SYSTEM_SPEC.md
 * §2.5 studentMarkHref, §3 `/api/mark/process` + `/api/mark/whole-paper/init`).
 *
 *   1. The student's set page links each item to /mark with `assignment=<item
 *      id>` (studentMarkHref), plus whatever /mark needs to load the item: the
 *      banked question, the paper, or the teacher's prompt.
 *   2. /mark reads that back (parseAssignmentDeepLink) and posts the item id
 *      with the upload as `assignment_item_id`.
 *   3. The marking route validates it (validateAssignmentItemForStudent) and
 *      then decides whether THIS upload is a hand-in for that item
 *      (planSingleQuestionLink / planWholePaperLink). Only then is the attempt
 *      stamped, and the result says so (`_assignment`).
 *
 * Step 3 exists because the item id rides in the URL for as long as the tab
 * is open: a student who marks a different question from the same page must
 * get their mark, not a hand-in for a question they never answered. A past-
 * paper item is linked only when the upload is for exactly that question; a
 * prompt item is always the teacher's prompt, so the prompt text, subject and
 * total come from the item, not from whatever is in the form.
 *
 * Pure and client-safe: /mark imports this module.
 */

import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { normalizeQuestionNumber } from '@/lib/marking/question-number'
import type { MarkIntent } from '@/lib/marking/types'
import type { Assignment, AssignmentItem } from '@/lib/teacher/types'

/** Query parameters /mark reads for a set item (alongside MARK_DEEP_LINK's). */
export const ASSIGNMENT_LINK_PARAMS = {
  /** The assignment_items.id being handed in. */
  item: 'assignment',
  /** `whole_paper` puts /mark in whole-paper mode on `paper` + `session`. */
  mode: 'mode',
  /** The teacher's prompt, loaded as the question. */
  task: 'task',
  /** Carried total for a prompt (MARK_DEEP_LINK.marks). */
  marks: 'marks',
} as const

/** The form field the marking routes read. */
export const ASSIGNMENT_ITEM_FIELD = 'assignment_item_id'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A well-formed item id (lower-cased), or null. */
export function parseAssignmentItemId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null
}

/** Where a student goes back to after marking an item of this set. */
export function assignmentReturnPath(assignmentId: string): string {
  return `/dashboard/assignments/${encodeURIComponent(assignmentId)}`
}

/**
 * The /mark link for one item of a set (spec §2.5; synchronous — CONTRACTS
 * ruling 13). `setTitle` labels the practice banner on /mark ("Practicing:
 * Algebra homework"); without it the banner falls back to generic copy.
 *
 *   past_paper_question → the banked-question deep link (pastPaperMarkHref),
 *                         paper and question locked from the bank
 *   whole_paper         → /mark in whole-paper mode on that paper
 *   prompt              → /mark in practice mode with the prompt as the question
 */
export function studentMarkHref(
  item: Pick<
    AssignmentItem,
    'id' | 'item_type' | 'paper_code' | 'paper_session' | 'question_number' | 'prompt_text' | 'total_marks'
  >,
  assignmentId: string,
  opts: { setTitle?: string | null; subjectCode?: string | null } = {}
): string {
  const returnTo = assignmentReturnPath(assignmentId)
  const title = opts.setTitle?.trim() || null

  if (item.item_type === 'past_paper_question' && item.paper_code && item.paper_session && item.question_number) {
    return pastPaperMarkHref({
      paperCode: item.paper_code,
      paperSession: item.paper_session,
      questionNumber: item.question_number,
      pattern: title ?? 'your teacher’s set',
      reason: 'Set by your teacher — your mark is added to the set.',
      returnTo,
      assignmentItemId: item.id,
    })
  }

  const params = new URLSearchParams()
  if (item.item_type === 'whole_paper' && item.paper_code && item.paper_session) {
    const subject = item.paper_code.split('/')[0]
    // `subject` + `session` also keep /mark's remembered last selection from
    // overwriting the paper (its restore effect stands down for a subject link).
    if (subject) params.set('subject', subject)
    params.set('session', normalizePaperSession(item.paper_session).label || item.paper_session)
    params.set('paper', item.paper_code)
    params.set(ASSIGNMENT_LINK_PARAMS.mode, 'whole_paper')
  } else if (item.item_type === 'prompt') {
    const subject = opts.subjectCode?.trim()
    if (subject) params.set('subject', subject)
    if (item.prompt_text) params.set(ASSIGNMENT_LINK_PARAMS.task, item.prompt_text)
    if (typeof item.total_marks === 'number' && item.total_marks > 0) {
      params.set(ASSIGNMENT_LINK_PARAMS.marks, String(Math.round(item.total_marks)))
    }
  }
  params.set(ASSIGNMENT_LINK_PARAMS.item, item.id)
  params.set('return', returnTo)
  return `/mark?${params.toString()}`
}

// ---------------------------------------------------------------------------
// /mark: reading the link back
// ---------------------------------------------------------------------------

export type AssignmentDeepLink = {
  itemId: string
  /** How /mark should set itself up; 'question' leaves it to the practice link. */
  mode: 'question' | 'whole_paper' | 'prompt'
  paper: string | null
  session: string | null
  task: string | null
  marks: number | null
}

/**
 * The set item a /mark URL carries, or null. Only the item id is trusted to
 * mean anything, and only after the server validates it; the rest just fills
 * the form.
 */
export function parseAssignmentDeepLink(sp: URLSearchParams): AssignmentDeepLink | null {
  const itemId = parseAssignmentItemId(sp.get(ASSIGNMENT_LINK_PARAMS.item))
  if (!itemId) return null
  const paper = sp.get('paper')?.trim() || null
  const task = sp.get(ASSIGNMENT_LINK_PARAMS.task)?.trim() || null
  const marksRaw = Number(sp.get(ASSIGNMENT_LINK_PARAMS.marks))
  const marks = Number.isInteger(marksRaw) && marksRaw > 0 && marksRaw <= 100 ? marksRaw : null
  const wholePaper = sp.get(ASSIGNMENT_LINK_PARAMS.mode) === 'whole_paper' && !!paper
  return {
    itemId,
    mode: wholePaper ? 'whole_paper' : task && sp.get('practice') !== '1' ? 'prompt' : 'question',
    paper: wholePaper ? paper : null,
    session: wholePaper ? sp.get('session')?.trim() || null : null,
    task: task ? task.slice(0, 2000) : null,
    marks,
  }
}

// ---------------------------------------------------------------------------
// Server: is this upload a hand-in for the item?
// ---------------------------------------------------------------------------

/** What the marking request asked for, as the route parsed it. */
export type SingleQuestionMarkRequest = {
  markIntent: MarkIntent
  manualPaperCode: string | null
  manualPaperSession: string | null
  manualQuestionNumber: string | null
  practiceSubjectCode: string | null
  ibComponentKey: string | null
  questionMarks: number | null
}

/** Fields the route replaces in the pipeline input when a prompt is linked. */
export type AssignmentMarkOverrides = {
  markIntent?: MarkIntent
  questionText?: string
  practiceSubjectCode?: string
  ibComponentKey?: string | null
  questionMarks?: number | null
}

export type MarkLinkPlan =
  | { linked: true; overrides: AssignmentMarkOverrides }
  | { linked: false; reason: string }

function samePaper(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function sameSession(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const norm = (s: string) =>
    (normalizePaperSession(s).label || s).trim().replace(/\s+/g, ' ').toLowerCase()
  return norm(a) === norm(b)
}

function sameQuestion(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const norm = (q: string) => normalizeQuestionNumber(q).replace(/^q(?=\d)/, '')
  return norm(a) === norm(b)
}

function questionRef(item: Pick<AssignmentItem, 'paper_code' | 'paper_session' | 'question_number'>): string {
  return [item.paper_code, item.paper_session, item.question_number ? `Q${item.question_number}` : null]
    .filter(Boolean)
    .join(' ')
}

/**
 * Whether a /api/mark/process upload hands in `item`, and for a prompt what
 * the pipeline must use. Not linked is not an error: the mark goes ahead as
 * an ordinary mark and the result says why it was not added to the set.
 */
export function planSingleQuestionLink(
  item: Pick<
    AssignmentItem,
    'item_type' | 'paper_code' | 'paper_session' | 'question_number' | 'prompt_text' | 'total_marks' | 'ib_component_key'
  >,
  assignment: Pick<Assignment, 'title' | 'subject_code'>,
  req: SingleQuestionMarkRequest
): MarkLinkPlan {
  if (item.item_type === 'past_paper_question') {
    const matches =
      req.markIntent === 'past_paper' &&
      samePaper(req.manualPaperCode, item.paper_code) &&
      sameSession(req.manualPaperSession, item.paper_session) &&
      sameQuestion(req.manualQuestionNumber, item.question_number)
    if (matches) return { linked: true, overrides: {} }
    return {
      linked: false,
      reason: `This mark was not added to “${assignment.title}”: the set asks for ${questionRef(item)}, and this upload was for a different question.`,
    }
  }

  if (item.item_type === 'whole_paper') {
    return {
      linked: false,
      reason: `This mark was not added to “${assignment.title}”: that set is a whole paper, handed in from whole-paper marking.`,
    }
  }

  // A prompt: the teacher's words are the question, marked in the class's
  // subject. The form's subject is kept only when it is the same course under
  // /mark's own code (the IB picker says 'ib-biology' + HL where the class
  // says 'ib-biology-hl'); anything else — a remembered selection from last
  // week, say — would mark the prompt by the wrong subject's conventions, and
  // takes its IB component with it.
  const formSubject = req.practiceSubjectCode?.trim() || null
  const keepForm = sameSubjectFamily(formSubject, assignment.subject_code)
  return {
    linked: true,
    overrides: {
      markIntent: 'practice_question',
      questionText: item.prompt_text ?? '',
      practiceSubjectCode: keepForm && formSubject ? formSubject : assignment.subject_code,
      ibComponentKey: (keepForm ? req.ibComponentKey : null) ?? item.ib_component_key ?? null,
      questionMarks:
        req.questionMarks ??
        (typeof item.total_marks === 'number' && item.total_marks > 0 ? Math.round(item.total_marks) : null),
    },
  }
}

/**
 * Whether two subject codes name the same course: equal, or one is the other
 * with a level suffix ('ib-biology' / 'ib-biology-hl'). Case-insensitive.
 */
export function sameSubjectFamily(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  if (!x || !y) return false
  return x === y || y.startsWith(`${x}-`) || x.startsWith(`${y}-`)
}

/** Whether a whole-paper init hands in `item`: the same paper and session, nothing else. */
export function planWholePaperLink(
  item: Pick<AssignmentItem, 'item_type' | 'paper_code' | 'paper_session' | 'question_number'>,
  assignment: Pick<Assignment, 'title'>,
  req: { paperCode: string | null; paperSession: string | null }
): MarkLinkPlan {
  if (
    item.item_type === 'whole_paper' &&
    samePaper(req.paperCode, item.paper_code) &&
    sameSession(req.paperSession, item.paper_session)
  ) {
    return { linked: true, overrides: {} }
  }
  const wanted =
    item.item_type === 'whole_paper'
      ? `the whole of ${questionRef(item)}`
      : item.item_type === 'past_paper_question'
        ? `a single question (${questionRef(item)})`
        : 'a written prompt'
  return {
    linked: false,
    reason: `This paper was not added to “${assignment.title}”: the set asks for ${wanted}.`,
  }
}

// ---------------------------------------------------------------------------
// The `_assignment` block on a mark result
// ---------------------------------------------------------------------------

/**
 * Sent on the mark result so /mark can say where the mark went. When the set
 * could not be checked at all (a database error — the mark went ahead,
 * unlinked) the set is unknown, so `assignment_id` and `title` are null.
 */
export type MarkAssignmentLink =
  | { linked: true; assignment_id: string; item_id: string; title: string }
  | {
      linked: false
      assignment_id: string | null
      item_id: string
      title: string | null
      /** Why it was not linked. */
      reason?: string
    }

/** What the student is told when their set could not be checked and the mark went ahead unlinked. */
export const ASSIGNMENT_UNCHECKED_REASON =
  'We couldn’t check your teacher’s set just now, so this mark isn’t linked to it yet. Your mark is saved — open the set later to see whether it was counted.'

/**
 * The `_assignment` block when validateAssignmentItemForStudent could not
 * answer (it threw): the student still gets their mark, told plainly that it
 * is not linked. Reconciliation on the banked question or paper may still
 * count it later; a prompt item can only be handed in from the set again.
 */
export function uncheckedAssignmentLink(itemId: string): MarkAssignmentLink {
  return { linked: false, assignment_id: null, item_id: itemId, title: null, reason: ASSIGNMENT_UNCHECKED_REASON }
}

export function markAssignmentLink(
  assignment: Pick<Assignment, 'id' | 'title'>,
  itemId: string,
  plan: MarkLinkPlan
): MarkAssignmentLink {
  return plan.linked
    ? { linked: true, assignment_id: assignment.id, item_id: itemId, title: assignment.title }
    : { linked: false, assignment_id: assignment.id, item_id: itemId, title: assignment.title, reason: plan.reason }
}

/** Read a result's `_assignment` defensively (it crosses the network). */
export function readMarkAssignmentLink(value: unknown): MarkAssignmentLink | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (typeof v.linked !== 'boolean') return null
  const itemId = parseAssignmentItemId(v.item_id)
  if (!itemId) return null
  const assignmentId = v.assignment_id == null ? null : parseAssignmentItemId(v.assignment_id)
  if (v.assignment_id != null && !assignmentId) return null
  const title = typeof v.title === 'string' && v.title.trim() ? v.title.trim().slice(0, 120) : null
  if (v.title != null && title === null) return null
  const reason = typeof v.reason === 'string' && v.reason.trim() ? v.reason.trim().slice(0, 400) : undefined

  if (v.linked) {
    // A link is only ever claimed for a set the server named.
    if (!assignmentId || !title) return null
    return { linked: true, assignment_id: assignmentId, item_id: itemId, title }
  }
  // Unlinked with no set named: only meaningful with the reason to show.
  if ((!assignmentId || !title) && !reason) return null
  const out: MarkAssignmentLink = { linked: false, assignment_id: assignmentId, item_id: itemId, title }
  if (reason) out.reason = reason
  return out
}

/** The line /mark shows under the score. */
export function markAssignmentNotice(link: MarkAssignmentLink): { tone: 'linked' | 'unlinked'; text: string } {
  if (link.linked) {
    return { tone: 'linked', text: `Linked to ${link.title} — your teacher can see this mark.` }
  }
  return {
    tone: 'unlinked',
    text: link.reason ?? (link.title ? `This mark was not added to “${link.title}”.` : 'This mark was not added to your teacher’s set.'),
  }
}
