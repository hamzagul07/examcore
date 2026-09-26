/**
 * The set composer's model (docs/TEACHER_SYSTEM_SPEC.md §4
 * `.../assignments/new`): what the pickers offer, how a prefilled link
 * (`?source=&codes=&students=`) becomes the composer's first state, and how
 * that state becomes the AssignmentDraftInput the POST route takes.
 *
 * The composer never decides what is valid on its own: the body it builds is
 * checked with parseAssignmentDraft — the same parser the route runs — before
 * it is sent, so a teacher sees "Pick at least one student" beside the Who
 * step instead of a round trip. The only checks here are for inputs the
 * parser never sees in their raw form (a marks box holding "ten").
 *
 * Pure; safe on client and server.
 */

import { sessionCodeToName, sessionCodeToYear } from '@/lib/marking/session'
import {
  ASSIGNMENT_SOURCES,
  DEFAULT_PER_TOPIC,
  MAX_ITEMS,
  MAX_PER_TOPIC,
  MAX_PROMPT_MARKS,
  MAX_TIMED_MINUTES,
  TITLE_MAX,
  expandedItemCount,
  isTopicCode,
  isUuid,
} from '@/lib/teacher/assignments/validate'
import type { Assignment, AssignmentItem, AssignmentKind, AssignmentSource, ItemInput } from '@/lib/teacher/types'
import { PREFILL_MAX_CODES, PREFILL_MAX_STUDENTS } from '@/components/teacher/assignments/links'

// ---------------------------------------------------------------------------
// Topics (TopicPicker)
// ---------------------------------------------------------------------------

export type TopicLeaf = { code: string; name: string }
export type TopicGroup = { code: string; name: string; leaves: TopicLeaf[] }

/** The shape lib/syllabi's getSyllabusTree returns, reduced to what a picker needs. */
type TreeLike = ReadonlyArray<{
  parent: { code: string; name: string }
  leaves: ReadonlyArray<{ code: string; name: string }>
}>

/**
 * The syllabus tree as the picker shows it: sections with their leaves. A
 * section whose only leaf is itself (every 9709 topic) keeps no leaves, so it
 * is one row rather than a heading over a copy of itself.
 */
export function topicTree(tree: TreeLike | null | undefined): TopicGroup[] {
  if (!tree) return []
  return tree.map((g) => {
    const leaves = g.leaves
      .filter((l) => l.code !== g.parent.code)
      .map((l) => ({ code: l.code, name: l.name }))
    return { code: g.parent.code, name: g.parent.name, leaves }
  })
}

/** code → name for every pickable code (sections and leaves). */
export function topicIndex(tree: readonly TopicGroup[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const g of tree) {
    out.set(g.code, g.name)
    for (const l of g.leaves) out.set(l.code, l.name)
  }
  return out
}

/**
 * Sections and leaves matching `query` (code prefix or words in the name,
 * case-insensitive). A section whose own name matches keeps all its leaves.
 */
export function filterTopicTree(tree: readonly TopicGroup[], query: string): TopicGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...tree]
  const hit = (code: string, name: string) => code.toLowerCase().startsWith(q) || name.toLowerCase().includes(q)
  const out: TopicGroup[] = []
  for (const g of tree) {
    if (hit(g.code, g.name)) {
      out.push(g)
      continue
    }
    const leaves = g.leaves.filter((l) => hit(l.code, l.name))
    if (leaves.length) out.push({ ...g, leaves })
  }
  return out
}

/** "Integration (5.4)", or the bare code when the syllabus has no name for it. */
export function topicLabel(code: string, names: ReadonlyMap<string, string>): string {
  const name = names.get(code)
  return name && name !== code ? `${name} (${code})` : code
}

// ---------------------------------------------------------------------------
// Papers (QuestionPicker, whole paper)
// ---------------------------------------------------------------------------

export type Choice = { value: string; label: string }
export type ChoiceGroup = { label: string; options: Choice[] }

/** The shape lib/subject-papers' getSubjectPaperStructure returns (what we read of it). */
type PaperStructureLike = {
  papers: ReadonlyArray<{ paper: number; name: string; components: readonly string[] }>
  sessions: readonly string[]
} | null

const SEASON_RANK: Record<string, number> = { w: 3, s: 2, m: 1 }

/**
 * Paper components grouped by paper ("Paper 1": 9709/11, 9709/12 …) and
 * exam sessions newest first ("October/November 2025" …), from the storage
 * cache of what papers exist. Values are exactly what the question-picker
 * route and the resolver expect (`9709/12`, the session's full label).
 */
export function paperChoices(
  structure: PaperStructureLike,
  subjectCode: string
): { components: ChoiceGroup[]; sessions: Choice[] } {
  if (!structure) return { components: [], sessions: [] }
  const components: ChoiceGroup[] = [...structure.papers]
    .sort((a, b) => a.paper - b.paper)
    .map((p) => ({
      label: p.name,
      options: [...p.components]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((c) => ({ value: `${subjectCode}/${c}`, label: `${subjectCode}/${c}` })),
    }))
    .filter((g) => g.options.length > 0)
  const sessions = [...new Set(structure.sessions.map((s) => s.trim().toLowerCase()))]
    .filter((code) => sessionCodeToName(code) !== null)
    .sort(
      (a, b) =>
        (sessionCodeToYear(b) ?? 0) - (sessionCodeToYear(a) ?? 0) ||
        (SEASON_RANK[b[0]] ?? 0) - (SEASON_RANK[a[0]] ?? 0)
    )
    .map((code) => {
      const label = sessionCodeToName(code) as string
      return { value: label, label }
    })
  return { components, sessions }
}

// ---------------------------------------------------------------------------
// Prefill from a link
// ---------------------------------------------------------------------------

export type SearchParamsInput = Record<string, string | string[] | undefined>

export type ComposerPrefill = {
  source: AssignmentSource
  kind: AssignmentKind
  /** Topic codes known to the class's syllabus, in link order. */
  topicCodes: string[]
  /** Active members of the class, in link order. */
  studentIds: string[]
  /** Linked students no longer in the class (or not ids at all), left out. */
  droppedStudents: number
  /** Linked codes not in the class's syllabus, left out. */
  droppedCodes: number
  sourceRef: Record<string, unknown> | null
  title: string
}

function listParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(',') : (value ?? '')
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function firstParam(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const GROUP_KEY = /^[a-z_]{1,24}:[A-Za-z0-9.*_-]{1,32}$/

function joinNames(codes: readonly string[], names: ReadonlyMap<string, string>): string {
  const shown = codes.slice(0, 2).map((c) => names.get(c) ?? c)
  const rest = codes.length - shown.length
  return `${shown.join(' & ')}${rest > 0 ? ` +${rest}` : ''}`
}

/** A starting title for a prefilled set, or '' for a manual one. Never over TITLE_MAX. */
export function suggestTitle(
  source: AssignmentSource,
  codes: readonly string[],
  names: ReadonlyMap<string, string>
): string {
  const topics = codes.length ? joinNames(codes, names) : ''
  let title = ''
  switch (source) {
    case 'reteach':
      title = topics ? `Reteach: ${topics}` : 'Reteach'
      break
    case 'error_group':
      title = topics ? `Drill: ${topics}` : 'Group drill'
      break
    case 'blindspot':
      title = topics ? `Blindspot drill: ${topics}` : 'Blindspot drill'
      break
    default:
      title = ''
  }
  return title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX - 1).trimEnd()}…` : title
}

/**
 * The composer's first state from its URL. Anything the link carries that the
 * class cannot use is dropped and counted — a student who has since left, a
 * code from another syllabus — so the composer can say so rather than
 * silently set work for fewer people than the card promised.
 */
export function parseComposerPrefill(
  sp: SearchParamsInput,
  ctx: { topics: ReadonlyMap<string, string>; activeStudentIds: ReadonlySet<string> }
): ComposerPrefill {
  const rawSource = firstParam(sp.source)
  const source: AssignmentSource =
    rawSource && (ASSIGNMENT_SOURCES as readonly string[]).includes(rawSource) ? (rawSource as AssignmentSource) : 'manual'

  const validCodes = [...new Set(listParam(sp.codes).filter(isTopicCode))]
  const known = validCodes.filter((c) => ctx.topics.has(c))
  const topicCodes = known.slice(0, PREFILL_MAX_CODES)

  const requested = [...new Set(listParam(sp.students).map((s) => s.toLowerCase()))]
  const studentIds = requested
    .filter((id) => isUuid(id) && ctx.activeStudentIds.has(id))
    .slice(0, PREFILL_MAX_STUDENTS)

  const group = firstParam(sp.group)
  const set = firstParam(sp.set)
  let sourceRef: Record<string, unknown> | null = null
  if (source !== 'manual') {
    sourceRef = {}
    if (validCodes.length) sourceRef.codes = validCodes.slice(0, PREFILL_MAX_CODES)
    if (group && GROUP_KEY.test(group)) sourceRef.group = group
    if (set && isUuid(set)) sourceRef.set_id = set.toLowerCase()
    if (studentIds.length) sourceRef.students = studentIds.length
    if (Object.keys(sourceRef).length === 0) sourceRef = null
  }

  return {
    source,
    kind: topicCodes.length ? 'topic_drill' : 'question_set',
    topicCodes,
    studentIds,
    droppedStudents: requested.length - studentIds.length,
    droppedCodes: validCodes.length - topicCodes.length,
    sourceRef,
    title: suggestTitle(source, topicCodes, ctx.topics),
  }
}

// ---------------------------------------------------------------------------
// State → AssignmentDraftInput
// ---------------------------------------------------------------------------

export type PickedQuestion = {
  id: string
  paper_code: string
  paper_session: string
  question_number: string
  total_marks: number | null
  preview: string | null
}

export type PickedTopic = { code: string; per_topic: number }

export type PickedPaper = { paper_code: string; paper_session: string }

export type PromptDraft = { key: string; text: string; marks: string }

export type ComposerState = {
  title: string
  instructions: string
  kind: AssignmentKind
  questions: PickedQuestion[]
  topics: PickedTopic[]
  papers: PickedPaper[]
  prompts: PromptDraft[]
  target: 'all' | 'picked'
  studentIds: string[]
  /** ISO instant or null. */
  dueAt: string | null
  /** The minutes box as typed; '' for untimed. */
  timedMinutes: string
  isMock: boolean
  allowLate: boolean
}

export function clampPerTopic(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PER_TOPIC
  return Math.min(MAX_PER_TOPIC, Math.max(1, Math.round(n)))
}

/** The items of the CURRENT kind — switching kind keeps the other picks but does not send them. */
export function composerItems(state: Pick<ComposerState, 'kind' | 'questions' | 'topics' | 'papers' | 'prompts'>): ItemInput[] {
  switch (state.kind) {
    case 'question_set':
      return state.questions.map((q) => ({
        item_type: 'past_paper_question' as const,
        paper_code: q.paper_code,
        paper_session: q.paper_session,
        question_number: q.question_number,
      }))
    case 'topic_drill':
      return state.topics.map((t) => ({
        item_type: 'topic' as const,
        topic_code: t.code,
        per_topic: clampPerTopic(t.per_topic),
      }))
    case 'whole_paper':
      return state.papers.map((p) => ({
        item_type: 'whole_paper' as const,
        paper_code: p.paper_code,
        paper_session: p.paper_session,
      }))
    case 'practice_prompt':
      return state.prompts
        .filter((p) => p.text.trim())
        .map((p) => {
          const marks = parsePromptMarks(p.marks)
          return typeof marks === 'number'
            ? { item_type: 'prompt' as const, prompt_text: p.text, total_marks: marks }
            : { item_type: 'prompt' as const, prompt_text: p.text }
        })
  }
}

/** Questions the set will hold once topics are expanded (the 12-question cap counts these). */
export function questionCount(state: Pick<ComposerState, 'kind' | 'questions' | 'topics' | 'papers' | 'prompts'>): number {
  return expandedItemCount(composerItems(state))
}

/** A prompt's marks box: undefined when blank, a whole number 1–100, or 'invalid'. */
export function parsePromptMarks(value: string): number | undefined | 'invalid' {
  const v = value.trim()
  if (!v) return undefined
  if (!/^\d{1,3}$/.test(v)) return 'invalid'
  const n = Number(v)
  return n >= 1 && n <= MAX_PROMPT_MARKS ? n : 'invalid'
}

/** The timer box: undefined when blank, whole minutes 1–600, or 'invalid'. */
export function parseTimedMinutes(value: string): number | undefined | 'invalid' {
  const v = value.trim()
  if (!v) return undefined
  if (!/^\d{1,4}$/.test(v)) return 'invalid'
  const n = Number(v)
  return n >= 1 && n <= MAX_TIMED_MINUTES ? n : 'invalid'
}

export type ComposerIssue = { field: string; error: string }

/**
 * Problems only the composer can see (raw boxes the body would lose), checked
 * before the body is built. Everything else is parseAssignmentDraft's job.
 */
export function composerIssue(state: ComposerState): ComposerIssue | null {
  if (state.kind === 'practice_prompt') {
    const index = state.prompts.filter((p) => p.text.trim()).findIndex((p) => parsePromptMarks(p.marks) === 'invalid')
    if (index >= 0) {
      return { field: `items.${index}`, error: `Marks for a prompt must be a whole number from 1 to ${MAX_PROMPT_MARKS}.` }
    }
  }
  if (parseTimedMinutes(state.timedMinutes) === 'invalid') {
    return { field: 'settings.timed_minutes', error: `A timed set runs 1 to ${MAX_TIMED_MINUTES} minutes.` }
  }
  if (questionCount(state) > MAX_ITEMS) {
    return { field: 'items', error: `A set can hold at most ${MAX_ITEMS} questions — take some out.` }
  }
  return null
}

/** The POST body (spec §2.1 AssignmentDraftInput). Run composerIssue first. */
export function buildDraftBody(
  state: ComposerState,
  opts: { publish: boolean; source: AssignmentSource; sourceRef: Record<string, unknown> | null }
): Record<string, unknown> {
  const timed = parseTimedMinutes(state.timedMinutes)
  const settings: { timed_minutes?: number; allow_late: boolean } = { allow_late: state.allowLate }
  if (typeof timed === 'number') settings.timed_minutes = timed
  const body: Record<string, unknown> = {
    title: state.title,
    kind: state.kind,
    instructions: state.instructions.trim() ? state.instructions : null,
    due_at: state.dueAt,
    is_mock: state.isMock,
    items: composerItems(state),
    settings,
    publish: opts.publish,
    source: opts.source,
    target: state.target === 'all' ? 'all' : { student_ids: state.studentIds },
  }
  if (opts.sourceRef) body.source_ref = opts.sourceRef
  return body
}

export type ComposerStep = 'title' | 'what' | 'who' | 'when'

/** Which step a `field` from the parser or the route belongs to, to scroll to and mark. */
export function composerStep(field: string | null | undefined): ComposerStep | null {
  if (!field) return null
  if (field === 'title' || field === 'instructions') return 'title'
  if (field === 'kind' || field === 'items' || field.startsWith('items.') || field === 'subject_code') return 'what'
  if (field === 'target') return 'who'
  if (field === 'due_at' || field === 'is_mock' || field.startsWith('settings')) return 'when'
  return null
}

/** `items.3` → 3; anything else → null. */
export function itemIndex(field: string | null | undefined): number | null {
  const m = /^items\.(\d+)$/.exec(field ?? '')
  return m ? Number(m[1]) : null
}

// ---------------------------------------------------------------------------
// Editing a draft (PATCH T/assignments/[aid])
// ---------------------------------------------------------------------------

type DraftSource = {
  assignment: Pick<Assignment, 'title' | 'instructions' | 'kind' | 'due_at' | 'is_mock' | 'settings' | 'target'>
  items: readonly AssignmentItem[]
  /** The draft's picked students (target 'students'), still in the class. */
  studentIds: readonly string[]
}

/**
 * A saved draft as the composer's state, so "Edit draft" reopens it where
 * the teacher left off. A drill's questions were chosen when it was saved;
 * they come back as their topics (with how many questions each had), and
 * saving re-picks them — the same rule that picked them the first time.
 */
export function draftToComposerState({ assignment, items, studentIds }: DraftSource): ComposerState {
  const ordered = [...items].sort((a, b) => a.position - b.position)
  const questions: PickedQuestion[] = []
  const topics: PickedTopic[] = []
  const papers: PickedPaper[] = []
  const prompts: PromptDraft[] = []
  for (const item of ordered) {
    if (item.item_type === 'prompt') {
      prompts.push({
        key: `p${prompts.length}`,
        text: item.prompt_text ?? '',
        marks: typeof item.total_marks === 'number' ? String(item.total_marks) : '',
      })
    } else if (item.item_type === 'whole_paper') {
      if (item.paper_code && item.paper_session) papers.push({ paper_code: item.paper_code, paper_session: item.paper_session })
    } else if (assignment.kind === 'topic_drill' && item.topic_code) {
      const held = topics.find((t) => t.code === item.topic_code)
      if (held) held.per_topic = clampPerTopic(held.per_topic + 1)
      else topics.push({ code: item.topic_code, per_topic: 1 })
    } else if (item.paper_code && item.paper_session && item.question_number) {
      questions.push({
        id: item.mark_scheme_id ?? item.id,
        paper_code: item.paper_code,
        paper_session: item.paper_session,
        question_number: item.question_number,
        total_marks: typeof item.total_marks === 'number' ? item.total_marks : null,
        preview: null,
      })
    }
  }
  const timed = assignment.settings?.timed_minutes
  return {
    title: assignment.title,
    instructions: assignment.instructions ?? '',
    kind: assignment.kind,
    questions,
    topics,
    papers,
    prompts: prompts.length ? prompts : [{ key: 'p0', text: '', marks: '' }],
    target: assignment.target === 'students' ? 'picked' : 'all',
    studentIds: [...studentIds],
    dueAt: assignment.due_at,
    timedMinutes: typeof timed === 'number' ? String(timed) : '',
    isMock: assignment.is_mock,
    allowLate: assignment.settings?.allow_late !== false,
  }
}

/**
 * The PATCH body that saves the composer over a draft. Who a set is for and
 * what kind it is are fixed once saved (the route takes neither), so they
 * are not sent; an empty timer box clears the timer.
 */
export function buildPatchBody(state: ComposerState): Record<string, unknown> {
  const timed = parseTimedMinutes(state.timedMinutes)
  return {
    title: state.title,
    instructions: state.instructions.trim() ? state.instructions : null,
    due_at: state.dueAt,
    is_mock: state.isMock,
    settings: { timed_minutes: typeof timed === 'number' ? timed : null, allow_late: state.allowLate },
    items: composerItems(state),
  }
}
