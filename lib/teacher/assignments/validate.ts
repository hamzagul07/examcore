/**
 * Request parsing for the assignment routes (docs/TEACHER_SYSTEM_SPEC.md §3,
 * `T/assignments/**`).
 *
 * Every body a teacher sends is read here, field by field, into a shape the
 * loaders can trust: a parse either returns the normalised value or the
 * first problem as `{ error, field }` — the `400 {error, field}` the routes
 * answer with, where `field` names the input the composer should mark.
 *
 * Pure: no I/O, no clock except the `now` passed in. Safe on client and
 * server, so the composer can run the same checks before it posts.
 */

import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import type {
  Assignment,
  AssignmentKind,
  AssignmentSource,
  ItemInput,
} from '@/lib/teacher/types'

// ---------------------------------------------------------------------------
// Limits (the DB CHECKs in 20260926b are the backstop; these are the answers)
// ---------------------------------------------------------------------------

export const TITLE_MAX = 120
export const INSTRUCTIONS_MAX = 4000
export const PROMPT_MAX = 2000
export const FEEDBACK_MAX = 2000
/** Items in one set after topics are expanded (spec §2.5: "max 12 rows"). */
export const MAX_ITEMS = 12
export const DEFAULT_PER_TOPIC = 2
export const MAX_PER_TOPIC = 4
export const MAX_TIMED_MINUTES = 600
export const MAX_PROMPT_MARKS = 100
export const MAX_TARGET_STUDENTS = 500
/** Clock skew allowed on "is this due date in the past". */
export const DUE_PAST_TOLERANCE_MS = 5 * 60_000
/** Nobody sets homework two years out; a date that far is a typo. */
export const MAX_DUE_AHEAD_MS = 2 * 365 * 86_400_000

export const ASSIGNMENT_KINDS: readonly AssignmentKind[] = [
  'question_set',
  'whole_paper',
  'topic_drill',
  'practice_prompt',
]
export const ASSIGNMENT_SOURCES: readonly AssignmentSource[] = [
  'manual',
  'blindspot',
  'error_group',
  'reteach',
]

/** What each kind of set may hold. Topics resolve into banked questions. */
const KIND_ITEMS: Record<AssignmentKind, ReadonlySet<ItemInput['item_type']>> = {
  question_set: new Set(['past_paper_question', 'topic']),
  topic_drill: new Set(['topic', 'past_paper_question']),
  whole_paper: new Set(['whole_paper']),
  practice_prompt: new Set(['prompt']),
}

const KIND_ITEM_ERROR: Record<AssignmentKind, string> = {
  question_set: 'A question set holds past-paper questions (or topics to pick them from).',
  topic_drill: 'A topic drill holds topics (or past-paper questions).',
  whole_paper: 'A whole-paper set holds whole papers only.',
  practice_prompt: 'A practice prompt set holds written prompts only.',
}

// ---------------------------------------------------------------------------
// Result shapes
// ---------------------------------------------------------------------------

export type FieldError = { ok: false; error: string; field: string; status?: 400 | 409 }
export type Parsed<T> = { ok: true; value: T } | FieldError

function fail(field: string, error: string, status?: 409): FieldError {
  return status ? { ok: false, error, field, status } : { ok: false, error, field }
}

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** A subject registry key: '9709', 'ib-biology-hl'. Never a LIKE metacharacter. */
export function isSubjectCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/.test(value)
}

/** '9709/12' — subject, slash, component. */
export function isPaperCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{0,31}\/[A-Za-z0-9-]{1,16}$/.test(value)
}

/** A syllabus leaf or section: '1.2', '5.4.4', 'AHL3.10', 'B2'. */
export function isTopicCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(value)
}

// ---------------------------------------------------------------------------
// Free text
// ---------------------------------------------------------------------------

// Real HTML element names. Only these are treated as tags, so maths such as
// "x<y and y>z" or "a < b" survives: the teacher's prompt is the question the
// student will answer, and eating a comparison changes the question.
const HTML_TAG = new RegExp(
  String.raw`<\/?(a|abbr|applet|article|aside|audio|b|base|big|blink|blockquote|body|br|button|canvas|center|code|col|colgroup|dd|del|details|dialog|div|dl|dt|em|embed|fieldset|figure|font|footer|form|frame|frameset|h[1-6]|head|header|hr|html|i|iframe|img|input|ins|kbd|label|li|link|main|mark|marquee|math|meta|nav|noscript|object|ol|option|p|picture|pre|q|s|samp|script|section|select|slot|small|source|span|strike|strong|style|sub|summary|sup|svg|table|tbody|td|template|textarea|tfoot|th|thead|title|tr|tt|u|ul|video)(?=[\s/>])(?:\s+[^<>]*=[^<>]*|\s*\/?)?>`,
  'gi'
)
// Inline tags vanish without a trace ("al<b>ge</b>bra" stays one word); any
// other tag (a paragraph, a line break, a table cell) leaves a space so the
// words either side of it do not run together.
const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'big', 'blink', 'code', 'del', 'em', 'font', 'i', 'ins', 'kbd', 'mark',
  'q', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'tt', 'u',
])
const dropTag = (_tag: string, name: string) => (INLINE_TAGS.has(name.toLowerCase()) ? '' : ' ')
// An event-handler attribute, but only inside something shaped like a tag.
// The repo-wide stripRawHtml rewrites " on…=" anywhere, which turns "Question
// one = 5 marks" into "Question data-x= 5 marks"; teacher prompts are maths
// and prose, so the rewrite is confined to angle brackets here.
const HANDLER_IN_TAG = /(<[^<>]*?)\bon[a-z]+\s*=/gi
const DANGEROUS_SCHEME = /(?:javascript|vbscript)\s*:/gi
const DATA_HTML = /\bdata:\s*text\/html/gi
// Control characters (tab, CR and LF are handled by the whitespace rules),
// zero-width characters and bidi overrides. The last can make a prompt render
// as something other than what was typed.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g

/**
 * Plain text from a teacher (spec §8: titles, instructions, prompts, notes).
 *
 * The same guarantees as lib/community/sanitize's stripRawHtml — no
 * script/iframe/style/… tags, no event handlers, no javascript:/vbscript:/
 * data:text/html — and stricter on tags (every real HTML tag goes, its text
 * stays), without that function's false positives on ordinary prose. Also
 * drops control and bidi-override characters and normalises whitespace:
 * single-line values collapse to single spaces, multi-line values keep their
 * line breaks (at most one blank line in a row). Stored values are rendered
 * as text, never as HTML; this keeps them clean for emails and exports too.
 *
 * Returns null for anything that is not a string.
 */
export function teacherText(value: unknown, opts: { multiline?: boolean } = {}): string | null {
  if (typeof value !== 'string') return null
  let out = value.normalize('NFC')
  let prev: string
  do {
    prev = out
    out = out
      .replace(HTML_TAG, dropTag)
      .replace(HANDLER_IN_TAG, '$1data-x=')
      .replace(DANGEROUS_SCHEME, '')
      .replace(DATA_HTML, '')
  } while (out !== prev)
  out = out.replace(CONTROL_CHARS, '')
  out = opts.multiline
    ? out
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
    : out.replace(/\s+/g, ' ')
  return out.trim()
}

// ---------------------------------------------------------------------------
// Timestamps
// ---------------------------------------------------------------------------

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$/

/**
 * An ISO-8601 instant with an explicit offset, as a canonical UTC string.
 * A bare "2026-10-02T16:00" is refused: the server cannot know whose 4pm it
 * is, and guessing puts every deadline an hour or eight off for someone.
 */
export function parseInstant(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40 || !ISO_RE.test(value.trim())) return null
  const ms = Date.parse(value.trim())
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

function parseDue(
  raw: unknown,
  field: string,
  opts: { now: Date; mustBeFuture: boolean }
): Parsed<string | null> {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null }
  const iso = parseInstant(raw)
  if (!iso) return fail(field, 'Enter the due date as a full date and time.')
  const ms = Date.parse(iso)
  if (ms > opts.now.getTime() + MAX_DUE_AHEAD_MS) {
    return fail(field, 'That due date is more than two years away — check the year.')
  }
  if (opts.mustBeFuture && ms < opts.now.getTime() - DUE_PAST_TOLERANCE_MS) {
    return fail(field, 'That due date has already passed. Pick a time in the future.')
  }
  return { ok: true, value: iso }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function intIn(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  return value >= min && value <= max ? value : null
}

/** One ItemInput, cleaned. `field` is `items.<i>` so the composer can point at the row. */
export function parseItemInput(raw: unknown, index: number): Parsed<ItemInput> {
  const field = `items.${index}`
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fail(field, 'Each item must be an object.')
  }
  const r = raw as Record<string, unknown>
  switch (r.item_type) {
    case 'past_paper_question':
    case 'whole_paper': {
      const paperCode = typeof r.paper_code === 'string' ? r.paper_code.trim() : ''
      if (!isPaperCode(paperCode)) return fail(field, 'Pick a paper (for example 9709/12).')
      const session = typeof r.paper_session === 'string' ? r.paper_session.trim() : ''
      const label = session.length <= 40 ? normalizePaperSession(session).label : ''
      if (!label) return fail(field, 'Pick the paper’s exam session.')
      if (r.item_type === 'whole_paper') {
        return { ok: true, value: { item_type: 'whole_paper', paper_code: paperCode, paper_session: label } }
      }
      const qn = typeof r.question_number === 'string' ? r.question_number.trim() : ''
      if (!/^[A-Za-z0-9][A-Za-z0-9().\s-]{0,15}$/.test(qn)) {
        return fail(field, 'Pick a question number.')
      }
      return {
        ok: true,
        value: { item_type: 'past_paper_question', paper_code: paperCode, paper_session: label, question_number: qn },
      }
    }
    case 'prompt': {
      const text = teacherText(r.prompt_text, { multiline: true })
      if (!text) return fail(field, 'Write the prompt your students will answer.')
      if (text.length > PROMPT_MAX) return fail(field, `Keep a prompt under ${PROMPT_MAX} characters.`)
      const value: Extract<ItemInput, { item_type: 'prompt' }> = { item_type: 'prompt', prompt_text: text }
      if (r.total_marks !== undefined && r.total_marks !== null) {
        const marks = intIn(r.total_marks, 1, MAX_PROMPT_MARKS)
        if (marks === null) return fail(field, `Marks for a prompt must be a whole number from 1 to ${MAX_PROMPT_MARKS}.`)
        value.total_marks = marks
      }
      if (r.ib_component_key !== undefined && r.ib_component_key !== null && r.ib_component_key !== '') {
        const key = typeof r.ib_component_key === 'string' ? r.ib_component_key.trim() : ''
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(key)) return fail(field, 'That IB component is not recognised.')
        value.ib_component_key = key
      }
      return { ok: true, value }
    }
    case 'topic': {
      const code = typeof r.topic_code === 'string' ? r.topic_code.trim() : ''
      if (!isTopicCode(code)) return fail(field, 'Pick a topic from the syllabus.')
      const value: Extract<ItemInput, { item_type: 'topic' }> = { item_type: 'topic', topic_code: code }
      if (r.per_topic !== undefined && r.per_topic !== null) {
        const n = intIn(r.per_topic, 1, MAX_PER_TOPIC)
        if (n === null) return fail(field, `Pick between 1 and ${MAX_PER_TOPIC} questions per topic.`)
        value.per_topic = n
      }
      return { ok: true, value }
    }
    default:
      return fail(field, 'Unknown item type.')
  }
}

/** How many rows an item list becomes once topics are expanded. */
export function expandedItemCount(items: readonly ItemInput[]): number {
  return items.reduce(
    (n, item) => n + (item.item_type === 'topic' ? item.per_topic ?? DEFAULT_PER_TOPIC : 1),
    0
  )
}

function parseItems(raw: unknown, kind: AssignmentKind): Parsed<ItemInput[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] }
  if (!Array.isArray(raw)) return fail('items', 'Items must be a list.')
  if (raw.length > MAX_ITEMS) return fail('items', `A set can hold at most ${MAX_ITEMS} items.`)
  const items: ItemInput[] = []
  for (let i = 0; i < raw.length; i++) {
    const parsed = parseItemInput(raw[i], i)
    if (!parsed.ok) return parsed
    if (!KIND_ITEMS[kind].has(parsed.value.item_type)) return fail(`items.${i}`, KIND_ITEM_ERROR[kind])
    items.push(parsed.value)
  }
  if (expandedItemCount(items) > MAX_ITEMS) {
    return fail('items', `A set can hold at most ${MAX_ITEMS} questions — pick fewer per topic.`)
  }
  return { ok: true, value: items }
}

// ---------------------------------------------------------------------------
// Settings, provenance, targeting
// ---------------------------------------------------------------------------

export type AssignmentSettings = Assignment['settings']

/**
 * Settings from a body. `timed_minutes: null` clears the timer (the merge in
 * mergeAssignmentSettings drops it); unknown keys are ignored.
 */
export function parseSettings(raw: unknown): Parsed<{ timed_minutes?: number | null; allow_late?: boolean }> {
  if (raw === undefined || raw === null) return { ok: true, value: {} }
  if (typeof raw !== 'object' || Array.isArray(raw)) return fail('settings', 'Settings must be an object.')
  const r = raw as Record<string, unknown>
  const out: { timed_minutes?: number | null; allow_late?: boolean } = {}
  if ('timed_minutes' in r) {
    if (r.timed_minutes === null) out.timed_minutes = null
    else {
      const n = intIn(r.timed_minutes, 1, MAX_TIMED_MINUTES)
      if (n === null) return fail('settings.timed_minutes', `A timed set runs 1 to ${MAX_TIMED_MINUTES} minutes.`)
      out.timed_minutes = n
    }
  }
  if ('allow_late' in r) {
    if (typeof r.allow_late !== 'boolean') return fail('settings.allow_late', 'Late work is on or off.')
    out.allow_late = r.allow_late
  }
  return { ok: true, value: out }
}

/** Current settings with a patch applied; `timed_minutes: null` removes the timer. */
export function mergeAssignmentSettings(
  current: AssignmentSettings | null | undefined,
  patch: { timed_minutes?: number | null; allow_late?: boolean }
): AssignmentSettings {
  const out: AssignmentSettings = {}
  const base = current && typeof current === 'object' ? current : {}
  if (typeof base.timed_minutes === 'number') out.timed_minutes = base.timed_minutes
  if (typeof base.allow_late === 'boolean') out.allow_late = base.allow_late
  if (patch.timed_minutes === null) delete out.timed_minutes
  else if (typeof patch.timed_minutes === 'number') out.timed_minutes = patch.timed_minutes
  if (typeof patch.allow_late === 'boolean') out.allow_late = patch.allow_late
  return out
}

const SOURCE_REF_MAX_KEYS = 12
const SOURCE_REF_MAX_LIST = 50

/**
 * The card that prompted a set (`?source=reteach&codes=…`) as a small flat
 * object of short strings, numbers, booleans and lists of those. Provenance
 * only — nothing reads it back as instructions — so anything else is dropped
 * rather than refused.
 */
export function sanitizeSourceRef(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= SOURCE_REF_MAX_KEYS) break
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(key)) continue
    if (typeof value === 'string') {
      const text = teacherText(value)
      if (text) out[key] = text.slice(0, 200)
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
    } else if (typeof value === 'boolean') {
      out[key] = value
    } else if (Array.isArray(value)) {
      const list = value
        .filter((v) => (typeof v === 'string' && v.length <= 64) || (typeof v === 'number' && Number.isFinite(v)))
        .map((v) => (typeof v === 'string' ? teacherText(v) ?? '' : v))
        .filter((v) => v !== '')
        .slice(0, SOURCE_REF_MAX_LIST)
      if (list.length) out[key] = list
    }
  }
  return Object.keys(out).length ? out : null
}

/** A list of student ids: uuids, deduplicated, lower-cased, 1..MAX_TARGET_STUDENTS. */
export function parseStudentIds(raw: unknown, field: string): Parsed<string[]> {
  if (!Array.isArray(raw)) return fail(field, 'Pick the students as a list.')
  if (raw.length === 0) return fail(field, 'Pick at least one student.')
  if (raw.length > MAX_TARGET_STUDENTS) return fail(field, `Pick at most ${MAX_TARGET_STUDENTS} students.`)
  const ids = new Set<string>()
  for (const id of raw) {
    if (!isUuid(id)) return fail(field, 'One of the students is not recognised.')
    ids.add(id.toLowerCase())
  }
  return { ok: true, value: [...ids] }
}

// ---------------------------------------------------------------------------
// POST T/assignments — AssignmentDraftInput
// ---------------------------------------------------------------------------

export type NormalizedDraft = {
  title: string
  kind: AssignmentKind
  instructions: string | null
  due_at: string | null
  is_mock: boolean
  items: ItemInput[]
  settings: { timed_minutes?: number | null; allow_late?: boolean }
  publish: boolean
  source: AssignmentSource
  source_ref: Record<string, unknown> | null
  target: 'all' | { student_ids: string[] }
}

function parseTitle(raw: unknown): Parsed<string> {
  const title = teacherText(raw)
  if (!title) return fail('title', 'Give the set a title.')
  if (title.length > TITLE_MAX) return fail('title', `Keep the title under ${TITLE_MAX} characters.`)
  return { ok: true, value: title }
}

function parseInstructions(raw: unknown): Parsed<string | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  const text = teacherText(raw, { multiline: true })
  if (text === null) return fail('instructions', 'Instructions must be text.')
  if (text.length > INSTRUCTIONS_MAX) {
    return fail('instructions', `Keep instructions under ${INSTRUCTIONS_MAX} characters.`)
  }
  return { ok: true, value: text || null }
}

/**
 * The composer's body (spec §2.1 AssignmentDraftInput), normalised. Publishing
 * needs at least one item and a due date that has not passed; a draft needs
 * neither.
 */
export function parseAssignmentDraft(body: unknown, now: Date = new Date()): Parsed<NormalizedDraft> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body', 'Send the set as a JSON object.')
  const b = body as Record<string, unknown>

  const title = parseTitle(b.title)
  if (!title.ok) return title

  if (typeof b.kind !== 'string' || !ASSIGNMENT_KINDS.includes(b.kind as AssignmentKind)) {
    return fail('kind', 'Pick what kind of work this is.')
  }
  const kind = b.kind as AssignmentKind

  if (b.publish !== undefined && typeof b.publish !== 'boolean') return fail('publish', 'publish must be true or false.')
  const publish = b.publish === true

  const instructions = parseInstructions(b.instructions)
  if (!instructions.ok) return instructions

  const due = parseDue(b.due_at, 'due_at', { now, mustBeFuture: publish })
  if (!due.ok) return due

  if (b.is_mock !== undefined && typeof b.is_mock !== 'boolean') return fail('is_mock', 'Mock is on or off.')

  const items = parseItems(b.items, kind)
  if (!items.ok) return items
  if (publish && items.value.length === 0) return fail('items', 'Add at least one item before publishing.')

  const settings = parseSettings(b.settings)
  if (!settings.ok) return settings

  let source: AssignmentSource = 'manual'
  if (b.source !== undefined && b.source !== null) {
    if (typeof b.source !== 'string' || !ASSIGNMENT_SOURCES.includes(b.source as AssignmentSource)) {
      return fail('source', 'Unknown source.')
    }
    source = b.source as AssignmentSource
  }

  let target: NormalizedDraft['target'] = 'all'
  if (b.target !== undefined && b.target !== null && b.target !== 'all') {
    if (typeof b.target !== 'object' || Array.isArray(b.target)) {
      return fail('target', 'Set it for the whole class or for picked students.')
    }
    const ids = parseStudentIds((b.target as Record<string, unknown>).student_ids, 'target')
    if (!ids.ok) return ids
    target = { student_ids: ids.value }
  }

  return {
    ok: true,
    value: {
      title: title.value,
      kind,
      instructions: instructions.value,
      due_at: due.value,
      is_mock: b.is_mock === true,
      items: items.value,
      settings: settings.value,
      publish,
      source,
      source_ref: sanitizeSourceRef(b.source_ref),
      target,
    },
  }
}

// ---------------------------------------------------------------------------
// PATCH T/assignments/[aid]
// ---------------------------------------------------------------------------

export type AssignmentPatch = {
  title?: string
  instructions?: string | null
  due_at?: string | null
  closed_at?: string | null
  is_mock?: boolean
  settings?: { timed_minutes?: number | null; allow_late?: boolean }
  items?: ItemInput[]
}

/**
 * `{title?, instructions?, due_at?, closed_at?, is_mock?, settings?, items?}`.
 * Items change only on a draft (409 once published: students may already
 * have handed work in against them); a draft cannot be closed.
 */
export function parseAssignmentPatch(
  body: unknown,
  current: Pick<Assignment, 'kind' | 'published_at'>
): Parsed<AssignmentPatch> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body', 'Send the changes as a JSON object.')
  const b = body as Record<string, unknown>
  const published = current.published_at !== null
  const out: AssignmentPatch = {}

  if ('title' in b) {
    const title = parseTitle(b.title)
    if (!title.ok) return title
    out.title = title.value
  }
  if ('instructions' in b) {
    const instructions = parseInstructions(b.instructions)
    if (!instructions.ok) return instructions
    out.instructions = instructions.value
  }
  if ('due_at' in b) {
    // No "must be in the future" here: moving a deadline earlier on purpose
    // is the teacher's call. Publishing re-checks it.
    const due = parseDue(b.due_at, 'due_at', { now: new Date(), mustBeFuture: false })
    if (!due.ok) return due
    out.due_at = due.value
  }
  if ('closed_at' in b) {
    if (!published) return fail('closed_at', 'A draft cannot be closed — publish it or delete it.', 409)
    if (b.closed_at === null) out.closed_at = null
    else {
      const iso = parseInstant(b.closed_at)
      if (!iso) return fail('closed_at', 'Send the close time as a full date and time.')
      out.closed_at = iso
    }
  }
  if ('is_mock' in b) {
    if (typeof b.is_mock !== 'boolean') return fail('is_mock', 'Mock is on or off.')
    out.is_mock = b.is_mock
  }
  if ('settings' in b) {
    const settings = parseSettings(b.settings)
    if (!settings.ok) return settings
    out.settings = settings.value
  }
  if ('items' in b) {
    if (published) {
      return fail('items', 'Items cannot change once a set is published — students may already have handed work in.', 409)
    }
    const items = parseItems(b.items, current.kind)
    if (!items.ok) return items
    out.items = items.value
  }

  if (Object.keys(out).length === 0) return fail('body', 'Nothing to change.')
  return { ok: true, value: out }
}

// ---------------------------------------------------------------------------
// PATCH T/assignments/[aid]/students/[sid]
// ---------------------------------------------------------------------------

export type StudentFlagsPatch = {
  excused?: boolean
  extended_due_at?: string | null
  feedback?: string | null
}

/**
 * `{excused?, extended_due_at?, feedback?}`. An extension must be later than
 * the set's due date (lateness is judged against the later of the two, so an
 * earlier date would silently do nothing); a set with no due date has
 * nothing to extend. Feedback is plain text; an empty note clears it.
 */
export function parseStudentFlagsPatch(
  body: unknown,
  assignment: Pick<Assignment, 'due_at'>
): Parsed<StudentFlagsPatch> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body', 'Send the changes as a JSON object.')
  const b = body as Record<string, unknown>
  const out: StudentFlagsPatch = {}

  if ('excused' in b) {
    if (typeof b.excused !== 'boolean') return fail('excused', 'Excused is on or off.')
    out.excused = b.excused
  }
  if ('extended_due_at' in b) {
    if (b.extended_due_at === null || b.extended_due_at === '') out.extended_due_at = null
    else {
      const iso = parseInstant(b.extended_due_at)
      if (!iso) return fail('extended_due_at', 'Enter the new deadline as a full date and time.')
      if (!assignment.due_at) return fail('extended_due_at', 'This set has no due date to extend.')
      if (Date.parse(iso) <= Date.parse(assignment.due_at)) {
        return fail('extended_due_at', 'An extension has to be later than the set’s due date.')
      }
      out.extended_due_at = iso
    }
  }
  if ('feedback' in b) {
    if (b.feedback === null) out.feedback = null
    else {
      const text = teacherText(b.feedback, { multiline: true })
      if (text === null) return fail('feedback', 'Feedback must be text.')
      if (text.length > FEEDBACK_MAX) return fail('feedback', `Keep feedback under ${FEEDBACK_MAX} characters.`)
      out.feedback = text || null
    }
  }

  if (Object.keys(out).length === 0) return fail('body', 'Nothing to change.')
  return { ok: true, value: out }
}

// ---------------------------------------------------------------------------
// POST T/assignments/[aid]/remind
// ---------------------------------------------------------------------------

/** `{student_ids?}` — absent or empty means "everyone still missing work". */
export function parseRemindBody(body: unknown): Parsed<{ student_ids: string[] | null }> {
  if (body === undefined || body === null) return { ok: true, value: { student_ids: null } }
  if (typeof body !== 'object' || Array.isArray(body)) return fail('body', 'Send a JSON object.')
  const raw = (body as Record<string, unknown>).student_ids
  if (raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0)) {
    return { ok: true, value: { student_ids: null } }
  }
  const ids = parseStudentIds(raw, 'student_ids')
  if (!ids.ok) return ids
  return { ok: true, value: { student_ids: ids.value } }
}
