/**
 * lib/teacher/assignments.ts against an in-memory PostgREST: the gate the
 * marking routes call, the marking hook, reconciliation (its once-a-minute
 * claim and its optimistic writes), creating a set (and undoing half of one),
 * reminders and per-student flags. The rules themselves are tested in the
 * pure modules' own files; this checks the reads and writes around them.
 */
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AssignmentInputError,
  createAssignmentWithItems,
  listAssignments,
  loadAssignment,
  onAttemptMarked,
  onAttemptsMarked,
  publishAssignment,
  reconcileAssignment,
  remindAssignment,
  resyncSubmissionsForAttempt,
  updateAssignment,
  updateStudentFlags,
  validateAssignmentItemForStudent,
} from '@/lib/teacher/assignments'
import type { Assignment } from '@/lib/teacher/types'

// ---------------------------------------------------------------------------
// A small PostgREST: filters, ordering, paging, projections (aliases, JSON
// paths, the mark_schemes embed), inserts with the one unique key that
// matters, updates, upserts, deletes and RPCs.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string; code?: string } | null }

let idSeq = 0
const newId = () => `99999999-0000-4000-8000-${String(++idSeq).padStart(12, '0')}`

function readPath(row: Row, expr: string): unknown {
  const m = expr.match(/^(\w+)(?:->([\w]+))?(?:->>?(\w+))?$/)
  if (!m) return row[expr]
  const [, col, mid, leaf] = m
  let value: unknown = row[col]
  for (const key of [mid, leaf]) {
    if (key === undefined) continue
    value = value && typeof value === 'object' ? (value as Row)[key] : undefined
  }
  if (expr.includes('->>') && value !== undefined && value !== null && typeof value !== 'string') value = String(value)
  return value ?? null
}

function cmp(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') {
    const x = Date.parse(a)
    const y = Date.parse(b)
    if (/^\d{4}-\d{2}-\d{2}T/.test(a) && Number.isFinite(x) && Number.isFinite(y)) return x - y
    return a < b ? -1 : a > b ? 1 : 0
  }
  return Number(a) - Number(b)
}

function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const UNIQUE: Record<string, string[]> = {
  assignment_submissions: ['item_id', 'student_id'],
  assignment_students: ['assignment_id', 'student_id'],
  assignment_items: ['assignment_id', 'position'],
}

class Q implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' | null = null
  private payload: Row | Row[] | null = null
  private conflict: string[] | null = null
  private projection: string | null = null
  private returning = false
  private filters: Array<(r: Row) => boolean> = []
  private orders: Array<{ col: string; asc: boolean }> = []
  private window: [number, number] | null = null
  private cap: number | null = null
  private mode: 'single' | 'maybe' | null = null
  constructor(
    private db: FakeDb,
    private table: string,
    private source: () => Row[]
  ) {}

  select(columns = '*') {
    if (this.op === null) this.op = 'select'
    else this.returning = true
    this.projection = columns
    return this
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert'
    this.payload = rows
    return this
  }
  update(patch: Row) {
    this.op = 'update'
    this.payload = patch
    return this
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string } = {}) {
    this.op = 'upsert'
    this.payload = rows
    this.conflict = opts.onConflict ? opts.onConflict.split(',') : UNIQUE[this.table] ?? ['id']
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => cmp(readPath(r, col), v) === 0 && readPath(r, col) !== null)
    return this
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => readPath(r, col) !== v)
    return this
  }
  in(col: string, values: unknown[]) {
    this.filters.push((r) => values.includes(readPath(r, col)))
    return this
  }
  is(col: string, v: null) {
    this.filters.push((r) => (readPath(r, col) ?? null) === v)
    return this
  }
  not(col: string, op: string, v: null) {
    assert.equal(op, 'is')
    this.filters.push((r) => (readPath(r, col) ?? null) !== v)
    return this
  }
  gte(col: string, v: unknown) {
    this.filters.push((r) => readPath(r, col) != null && cmp(readPath(r, col), v) >= 0)
    return this
  }
  lte(col: string, v: unknown) {
    this.filters.push((r) => readPath(r, col) != null && cmp(readPath(r, col), v) <= 0)
    return this
  }
  like(col: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`)
    this.filters.push((r) => re.test(String(readPath(r, col) ?? '')))
    return this
  }
  contains(col: string, values: unknown[]) {
    this.filters.push((r) => Array.isArray(r[col]) && values.every((v) => (r[col] as unknown[]).includes(v)))
    return this
  }
  or(expr: string) {
    const clauses = splitTop(expr).map((c) => {
      const [col, op, ...rest] = c.split('.')
      const raw = rest.join('.').replace(/^"|"$/g, '')
      return (r: Row) => {
        const v = readPath(r, col)
        if (op === 'is') return (v ?? null) === null
        if (op === 'eq') return v === raw
        if (op === 'lt') return v != null && cmp(v, raw) < 0
        throw new Error(`fake or(): ${op}`)
      }
    })
    this.filters.push((r) => clauses.some((f) => f(r)))
    return this
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orders.push({ col, asc: opts.ascending !== false })
    return this
  }
  range(from: number, to: number) {
    this.window = [from, to]
    return this
  }
  limit(n: number) {
    this.cap = n
    return this
  }
  maybeSingle() {
    this.mode = 'maybe'
    return this
  }
  single() {
    this.mode = 'single'
    return this
  }

  private project(rows: Row[]): Row[] {
    const cols = this.projection
    if (!cols || cols === '*') return rows.map((r) => ({ ...r }))
    return rows.map((r) => {
      const out: Row = {}
      for (const part of splitTop(cols)) {
        const embed = part.match(/^(\w+)\s*\((.*)\)$/)
        if (embed) {
          const [, name, inner] = embed
          assert.equal(name, 'mark_schemes', 'only the mark_schemes embed is faked')
          const scheme = (this.db.tables.mark_schemes ?? []).find((s) => s.id === r.mark_scheme_id)
          out[name] = scheme ? Object.fromEntries(inner.split(',').map((c) => [c.trim(), scheme[c.trim()] ?? null])) : null
          continue
        }
        const [alias, expr] = part.includes(':') ? part.split(':') : [part, part]
        out[alias.trim()] = readPath(r, expr.trim())
      }
      return out
    })
  }

  private shape(rows: Row[]): Result {
    const out = this.project(rows)
    if (this.mode === 'maybe') {
      if (out.length > 1) return { data: null, error: { message: 'multiple rows' } }
      return { data: out[0] ?? null, error: null }
    }
    if (this.mode === 'single') {
      if (out.length !== 1) return { data: null, error: { message: 'expected one row' } }
      return { data: out[0], error: null }
    }
    return { data: out, error: null }
  }

  private matches(): Row[] {
    return this.source().filter((r) => this.filters.every((f) => f(r)))
  }

  private duplicate(row: Row, except?: Row): Row | undefined {
    const key = UNIQUE[this.table]
    if (!key) return undefined
    return (this.db.tables[this.table] ?? []).find((r) => r !== except && key.every((k) => r[k] === row[k]))
  }

  private run(): Result {
    const key = `${this.op}:${this.table}`
    if (this.db.failing.has(key) || this.db.failOnce.delete(key)) {
      return { data: null, error: { message: `${this.table} ${this.op} failed` } }
    }
    const table = (this.db.tables[this.table] ??= [])
    switch (this.op) {
      case 'select': {
        let rows = [...this.matches()].sort((a, b) => {
          for (const o of this.orders) {
            const c = cmp(readPath(a, o.col), readPath(b, o.col))
            if (c !== 0) return o.asc ? c : -c
          }
          return 0
        })
        if (this.window) rows = rows.slice(this.window[0], this.window[1] + 1)
        if (this.cap !== null) rows = rows.slice(0, this.cap)
        return this.shape(rows)
      }
      case 'insert': {
        const rows = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({
          id: newId(),
          created_at: this.db.now,
          ...r,
        }))
        this.db.beforeInsert?.(this.table, rows)
        for (const r of rows) {
          if (this.duplicate(r)) return { data: null, error: { message: 'duplicate key value', code: '23505' } }
        }
        table.push(...rows)
        return this.returning ? this.shape(rows) : { data: null, error: null }
      }
      case 'update': {
        const rows = this.matches()
        for (const r of rows) Object.assign(r, this.payload)
        return this.returning ? this.shape(rows) : { data: null, error: null }
      }
      case 'upsert': {
        const out: Row[] = []
        for (const r of Array.isArray(this.payload) ? this.payload : [this.payload!]) {
          const hit = table.find((t) => this.conflict!.every((k) => t[k] === r[k]))
          if (hit) {
            Object.assign(hit, r)
            out.push(hit)
          } else {
            const row = { created_at: this.db.now, ...r }
            table.push(row)
            out.push(row)
          }
        }
        return this.returning ? this.shape(out) : { data: null, error: null }
      }
      case 'delete': {
        const doomed = new Set(this.matches())
        this.db.tables[this.table] = table.filter((r) => !doomed.has(r))
        if (this.table === 'assignments') {
          // ON DELETE CASCADE
          for (const t of ['assignment_items', 'assignment_students', 'assignment_submissions']) {
            this.db.tables[t] = (this.db.tables[t] ?? []).filter(
              (r) => ![...doomed].some((d) => d.id === r.assignment_id)
            )
          }
        }
        return { data: null, error: null }
      }
      default:
        throw new Error('fake: no operation')
    }
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null
  ): PromiseLike<A | B> {
    this.db.requests.push(`${this.op}:${this.table}`)
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }
}

class FakeDb {
  requests: string[] = []
  failing = new Set<string>()
  /** Fails the next request of that kind only. */
  failOnce = new Set<string>()
  now = '2026-09-25T12:00:00.000Z'
  beforeInsert?: (table: string, rows: Row[]) => void
  constructor(
    public tables: Record<string, Row[]>,
    private rpcs: Record<string, (args: Row) => Row[]> = {}
  ) {}
  from(table: string) {
    return new Q(this, table, () => this.tables[table] ?? [])
  }
  rpc(fn: string, args: Row) {
    return new Q(this, fn, () => this.rpcs[fn]?.(args) ?? []).select('*')
  }
  client(): SupabaseClient {
    return this as unknown as SupabaseClient
  }
}

// ---------------------------------------------------------------------------
// Fixtures: one class, one teacher, three students, two sets
// ---------------------------------------------------------------------------

const TEACHER = '10000000-0000-4000-8000-000000000001'
const CLASS = '20000000-0000-4000-8000-000000000001'
const OTHER_CLASS = '20000000-0000-4000-8000-000000000002'
const AMIRA = '30000000-0000-4000-8000-0000000000a1'
const BEN = '30000000-0000-4000-8000-0000000000b2'
const CARL = '30000000-0000-4000-8000-0000000000c3'
const SET = '40000000-0000-4000-8000-000000000001'
const SET_B = '40000000-0000-4000-8000-000000000002'
const ITEM_Q3 = '50000000-0000-4000-8000-000000000001'
const ITEM_PROMPT = '50000000-0000-4000-8000-000000000002'
const ITEM_B_Q3 = '50000000-0000-4000-8000-000000000003'
const SCHEME_Q3 = '60000000-0000-4000-8000-000000000003'
const SCHEME_Q3_DUP = '60000000-0000-4000-8000-000000000033'

function setRow(over: Row = {}): Row {
  return {
    id: SET,
    classroom_id: CLASS,
    teacher_id: TEACHER,
    title: 'Week 3 algebra',
    instructions: null,
    kind: 'question_set',
    subject_code: '9709',
    is_mock: false,
    source: 'manual',
    source_ref: null,
    target: 'all',
    due_at: '2026-09-26T16:00:00.000Z',
    published_at: '2026-09-21T08:00:00.000Z',
    closed_at: null,
    archived_at: null,
    reconciled_at: null,
    settings: {},
    created_at: '2026-09-20T08:00:00.000Z',
    updated_at: '2026-09-20T08:00:00.000Z',
    ...over,
  }
}

function itemRow(over: Row = {}): Row {
  return {
    id: ITEM_Q3,
    assignment_id: SET,
    position: 0,
    item_type: 'past_paper_question',
    mark_scheme_id: SCHEME_Q3,
    paper_code: '9709/12',
    paper_session: 'May/June 2024',
    question_number: '3',
    total_marks: 6,
    syllabus_tags: ['1.2'],
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
    ...over,
  }
}

let attemptSeq = 0
function attemptRow(over: Row = {}): Row {
  attemptSeq += 1
  return {
    id: `70000000-0000-4000-8000-${String(attemptSeq).padStart(12, '0')}`,
    user_id: AMIRA,
    created_at: '2026-09-22T10:00:00.000Z',
    marks_earned: 4,
    total_marks: 6,
    mark_scheme_id: SCHEME_Q3,
    assignment_item_id: null,
    ai_marking: { marking_style: 'point_based' },
    ...over,
  }
}

function world(over: { sets?: Row[]; items?: Row[]; attempts?: Row[]; members?: Row[]; classes?: Row[]; flags?: Row[] } = {}) {
  return new FakeDb(
    {
      classrooms: over.classes ?? [
        { id: CLASS, teacher_id: TEACHER, name: '12B Maths', invite_code: 'ABC234', subject_code: '9709', archived_at: null, board: 'Cambridge', level: 'A-Level' },
        { id: OTHER_CLASS, teacher_id: TEACHER, name: 'Other', invite_code: 'XYZ789', subject_code: '9709', archived_at: null, board: 'Cambridge', level: 'A-Level' },
      ],
      classroom_memberships: over.members ?? [
        { classroom_id: CLASS, student_id: AMIRA, status: 'active', joined_at: '2026-09-01T00:00:00.000Z', left_at: null, removed_at: null },
        { classroom_id: CLASS, student_id: BEN, status: 'active', joined_at: '2026-09-01T00:00:00.000Z', left_at: null, removed_at: null },
        { classroom_id: CLASS, student_id: CARL, status: 'left', joined_at: '2026-09-01T00:00:00.000Z', left_at: '2026-09-05T00:00:00.000Z', removed_at: null },
      ],
      assignments: over.sets ?? [setRow()],
      assignment_items: over.items ?? [
        itemRow(),
        itemRow({ id: ITEM_PROMPT, position: 1, item_type: 'prompt', mark_scheme_id: null, paper_code: null, paper_session: null, question_number: null, prompt_text: 'Explain why x < 3.', total_marks: 4 }),
      ],
      assignment_students: over.flags ?? [],
      assignment_submissions: [],
      attempts: over.attempts ?? [],
      mark_schemes: [
        { id: SCHEME_Q3, paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3', question_text: 'Solve x^2 = 9.', total_marks: 6, syllabus_tags: ['1.2'] },
        { id: SCHEME_Q3_DUP, paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3', question_text: 'Solve x^2 = 9.', total_marks: 6, syllabus_tags: ['1.2'] },
      ],
    },
    {
      teacher_roster_profiles: () => [
        { id: AMIRA, full_name: 'Amira Khan', board: null, level: null, joined_at: '2026-09-01T00:00:00.000Z', status: 'active' },
        { id: BEN, full_name: 'Ben Okafor', board: null, level: null, joined_at: '2026-09-01T00:00:00.000Z', status: 'active' },
        { id: CARL, full_name: 'Carl Diaz', board: null, level: null, joined_at: '2026-09-01T00:00:00.000Z', status: 'left' },
      ],
    }
  )
}

const NOW = new Date('2026-09-25T12:00:00.000Z')
const subs = (db: FakeDb) => db.tables.assignment_submissions

async function gate() {
  const db = world()
  const ok = await validateAssignmentItemForStudent(db.client(), ITEM_Q3, AMIRA, NOW)
  assert.ok(ok.ok && ok.item.id === ITEM_Q3 && ok.assignment.id === SET, 'a member may hand in')

  const reasonFor = async (d: FakeDb, item = ITEM_Q3, student = AMIRA) => {
    const r = await validateAssignmentItemForStudent(d.client(), item, student, NOW)
    return r.ok ? null : r.reason
  }
  const generic = await reasonFor(world(), '50000000-0000-4000-8000-00000000ffff')
  assert.ok(generic && /isn’t available/.test(generic), 'an unknown item')
  assert.equal(await reasonFor(world(), 'not-a-uuid'), generic, 'a malformed id, same answer')
  assert.equal(await reasonFor(world(), ITEM_Q3, CARL), generic, 'a student who left gets the same answer as a stranger')
  assert.equal(await reasonFor(world(), ITEM_Q3, '30000000-0000-4000-8000-0000000000ff'), generic, 'a stranger')
  assert.equal(await reasonFor(world({ sets: [setRow({ published_at: null })] })), generic, 'a draft is not disclosed')
  assert.equal(await reasonFor(world({ sets: [setRow({ target: 'students' })] })), generic, 'not one of the picked students')
  assert.equal(
    await reasonFor(world({ sets: [setRow({ target: 'students' })], flags: [{ assignment_id: SET, student_id: AMIRA }] })),
    null,
    'a picked student'
  )
  assert.match((await reasonFor(world({ sets: [setRow({ archived_at: '2026-09-24T00:00:00.000Z' })] })))!, /removed this set/)
  assert.match(
    (await reasonFor(
      world({
        classes: [{ id: CLASS, teacher_id: TEACHER, name: 'c', invite_code: 'ABC234', subject_code: '9709', archived_at: '2026-09-24T00:00:00.000Z' }],
      })
    ))!,
    /archived this class/
  )
  const closed = { closed_at: '2026-09-24T00:00:00.000Z' }
  assert.equal(await reasonFor(world({ sets: [setRow(closed)] })), null, 'closed, but late work is allowed by default')
  assert.match((await reasonFor(world({ sets: [setRow({ ...closed, settings: { allow_late: false } })] })))!, /closed/)

  // An extension past the close keeps the set open to that student only.
  const strict = setRow({ settings: { allow_late: false } })
  const day8 = new Date('2026-10-04T12:00:00.000Z')
  const extended = world({
    sets: [strict],
    flags: [{ assignment_id: SET, student_id: AMIRA, excused_at: null, extended_due_at: '2026-10-06T16:00:00.000Z' }],
  })
  const onDay8 = async (student: string) => {
    const r = await validateAssignmentItemForStudent(extended.client(), ITEM_Q3, student, day8)
    return r.ok ? null : r.reason
  }
  assert.equal(await onDay8(AMIRA), null, 'day 8: the student given ten days may still hand in')
  assert.match((await onDay8(BEN))!, /closed/, 'day 8: everyone else is refused')
  const manual = world({
    sets: [setRow({ ...closed, settings: { allow_late: false } })],
    flags: [{ assignment_id: SET, student_id: AMIRA, excused_at: null, extended_due_at: '2026-09-28T16:00:00.000Z' }],
  })
  assert.equal(await reasonFor(manual), null, 'a manual close does not take an extension back')
  assert.match((await reasonFor(manual, ITEM_Q3, BEN))!, /closed/)

  // A database error is thrown, never read as "not allowed" (the routes mark anyway).
  const broken = world()
  broken.failing.add('select:assignment_students')
  await assert.rejects(() => validateAssignmentItemForStudent(broken.client(), ITEM_Q3, AMIRA, NOW))
}

async function hook() {
  // A stamped attempt becomes a linked hand-in.
  {
    const a = attemptRow({ assignment_item_id: ITEM_Q3 })
    const db = world({ attempts: [a] })
    await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [a.id as string] })
    assert.equal(subs(db).length, 1, 'one hand-in')
    assert.equal(subs(db)[0].source, 'linked')
    assert.equal(subs(db)[0].attempt_id, a.id)
    assert.equal(subs(db)[0].status, 'submitted')
    await onAttemptMarked(db.client(), {
      id: a.id as string,
      user_id: AMIRA,
      assignment_item_id: ITEM_Q3,
      mark_scheme_id: SCHEME_Q3,
      marks_earned: 4,
      total_marks: 6,
      created_at: a.created_at as string,
    })
    assert.equal(subs(db).length, 1, 'the hook is idempotent')
    assert.equal(subs(db)[0].attempt_count, 1, 'and counts the attempt once')
  }

  // A plain /mark on the same question hands in every open set holding it.
  {
    const a = attemptRow()
    const db = world({
      sets: [setRow(), setRow({ id: SET_B, title: 'Revision', created_at: '2026-09-21T00:00:00.000Z' })],
      items: [itemRow(), itemRow({ id: ITEM_B_Q3, assignment_id: SET_B })],
      attempts: [a],
    })
    await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [a.id as string] })
    assert.deepEqual(subs(db).map((s) => s.item_id).sort(), [ITEM_Q3, ITEM_B_Q3].sort(), 'both sets')
    assert.ok(subs(db).every((s) => s.source === 'reconciled'))

    const better = attemptRow({ marks_earned: 6, created_at: '2026-09-23T10:00:00.000Z' })
    db.tables.attempts.push(better)
    await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [better.id as string] })
    const row = subs(db).find((s) => s.item_id === ITEM_Q3)!
    assert.equal(row.attempt_id, better.id, 'a better attempt replaces the best')
    assert.equal(row.attempt_count, 2)
  }

  // Nothing for a student in no class, a guest, or with v2 switched off.
  {
    const a = attemptRow({ user_id: CARL, assignment_item_id: ITEM_Q3 })
    const db = world({ attempts: [a] })
    await onAttemptsMarked(db.client(), { userId: CARL, attemptIds: [a.id as string] })
    assert.equal(subs(db).length, 0, 'a student who left hands nothing in')
    assert.deepEqual(db.requests, ['select:classroom_memberships'], 'and it cost one read')
    await onAttemptsMarked(db.client(), { userId: null, attemptIds: [a.id as string] })
    assert.equal(db.requests.length, 1, 'a guest costs nothing')
  }
  {
    const a = attemptRow({ assignment_item_id: ITEM_Q3 })
    const db = world({ attempts: [a] })
    process.env.TEACHER_V2 = '0'
    try {
      await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [a.id as string] })
    } finally {
      delete process.env.TEACHER_V2
    }
    assert.equal(db.requests.length, 0, 'TEACHER_V2=0: the hook does nothing at all')
  }

  // Someone else inserts the row first: re-read, re-plan, update — nothing lost.
  {
    const a = attemptRow({ assignment_item_id: ITEM_Q3, marks_earned: 5 })
    const db = world({ attempts: [a] })
    let raced = false
    db.beforeInsert = (table) => {
      if (table !== 'assignment_submissions' || raced) return
      raced = true
      db.tables.assignment_submissions.push({
        id: newId(),
        assignment_id: SET,
        item_id: ITEM_Q3,
        student_id: AMIRA,
        attempt_id: 'earlier',
        attempt_count: 1,
        marks_earned: 2,
        total_marks: 6,
        status: 'submitted',
        source: 'reconciled',
        first_submitted_at: '2026-09-21T09:00:00.000Z',
        last_submitted_at: '2026-09-21T09:00:00.000Z',
      })
    }
    await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [a.id as string] })
    assert.equal(subs(db).length, 1, 'no duplicate')
    const row = subs(db)[0]
    assert.equal(row.attempt_id, a.id, 'the better mark won')
    assert.equal(row.attempt_count, 2, 'both attempts counted')
    assert.equal(row.first_submitted_at, '2026-09-21T09:00:00.000Z', 'the earlier hand-in kept')
    assert.equal(row.source, 'linked')
  }

  // A failing database never escapes the hook.
  {
    const a = attemptRow({ assignment_item_id: ITEM_Q3 })
    const db = world({ attempts: [a] })
    db.failing.add('select:assignments')
    const originalError = console.error
    console.error = () => {}
    try {
      await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [a.id as string] })
    } finally {
      console.error = originalError
    }
    assert.equal(subs(db).length, 0)
  }
}

async function reconcile() {
  const plain = attemptRow({ user_id: BEN, mark_scheme_id: SCHEME_Q3_DUP, created_at: '2026-09-27T10:00:00.000Z' })
  const tooEarly = attemptRow({ user_id: AMIRA, created_at: '2026-09-20T10:00:00.000Z' })
  const leftStudent = attemptRow({ user_id: CARL })
  const db = world({ attempts: [plain, tooEarly, leftStudent] })

  const first = await reconcileAssignment(db.client(), SET, { now: NOW })
  assert.deepEqual(first, { linked: 1 }, 'the plain /mark (a second bank row for the question) is reconciled')
  const row = subs(db)[0]
  assert.equal(row.student_id, BEN)
  assert.equal(row.status, 'late', 'after the due date')
  assert.equal(db.tables.assignments[0].reconciled_at, NOW.toISOString(), 'the minute is claimed')

  const again = await reconcileAssignment(db.client(), SET, { now: new Date(NOW.getTime() + 30_000) })
  assert.deepEqual(again, { linked: 0 }, 'skipped under a minute')
  const forced = await reconcileAssignment(db.client(), SET, { now: new Date(NOW.getTime() + 30_000), force: true })
  assert.deepEqual(forced, { linked: 0 }, 'forced, but nothing changed so nothing is written')

  // Two views at once: the conditional claim lets one through.
  db.tables.assignments[0].reconciled_at = null
  const [x, y] = await Promise.all([
    reconcileAssignment(db.client(), SET, { now: new Date(NOW.getTime() + 120_000) }),
    reconcileAssignment(db.client(), SET, { now: new Date(NOW.getTime() + 120_000) }),
  ])
  assert.equal(x.linked + y.linked, 0)

  const draft = world({ sets: [setRow({ published_at: null })], attempts: [plain] })
  assert.deepEqual(await reconcileAssignment(draft.client(), SET, { now: NOW }), { linked: 0 }, 'drafts are never reconciled')
  const archivedClass = world({
    classes: [{ id: CLASS, teacher_id: TEACHER, name: 'c', invite_code: 'ABC234', subject_code: '9709', archived_at: '2026-09-24T00:00:00.000Z' }],
    attempts: [plain],
  })
  assert.deepEqual(
    await reconcileAssignment(archivedClass.client(), SET, { now: NOW }),
    { linked: 0 },
    'an archived class keeps its hand-ins but reads no live attempts'
  )

  // Legacy: the item's scheme row is gone (FK set null); the key still matches.
  const legacy = world({
    items: [itemRow({ mark_scheme_id: null })],
    attempts: [attemptRow({ user_id: AMIRA, mark_scheme_id: SCHEME_Q3_DUP })],
  })
  assert.deepEqual(await reconcileAssignment(legacy.client(), SET, { now: NOW }), { linked: 1 }, 'legacy null mark_scheme_id')

  // A set that refuses late work still takes an extended student's work after its close.
  {
    const lateButExtended = attemptRow({ user_id: AMIRA, created_at: '2026-10-05T10:00:00.000Z' })
    const lateNoExtension = attemptRow({ user_id: BEN, created_at: '2026-10-05T10:00:00.000Z' })
    const strict = world({
      sets: [setRow({ settings: { allow_late: false } })],
      attempts: [lateButExtended, lateNoExtension],
      flags: [{ assignment_id: SET, student_id: AMIRA, excused_at: null, extended_due_at: '2026-10-06T16:00:00.000Z', feedback: null, feedback_at: null, reminded_at: null }],
    })
    assert.deepEqual(await reconcileAssignment(strict.client(), SET, { now: new Date('2026-10-05T12:00:00.000Z') }), { linked: 1 })
    assert.deepEqual(subs(strict).map((r) => [r.student_id, r.status]), [[AMIRA, 'submitted']], 'on time for her; nothing for Ben')
  }

  // Reconcile keeps a review that belongs to the attempt it picks.
  {
    const reviewedAttempt = attemptRow({ user_id: BEN, marks_earned: 5, created_at: '2026-09-23T10:00:00.000Z' })
    const db2 = world({ attempts: [reviewedAttempt] })
    db2.tables.teacher_overrides = [
      { id: newId(), attempt_id: reviewedAttempt.id, decision: 'confirm', created_at: '2026-09-24T10:00:00.000Z' },
    ]
    await reconcileAssignment(db2.client(), SET, { now: NOW })
    assert.equal(subs(db2)[0].status, 'reviewed', 'a confirmed attempt reconciled later is shown reviewed')
  }

  // A failure gives the claim back so the next view retries.
  const broken = world({ attempts: [plain] })
  broken.failing.add('select:attempts')
  await assert.rejects(() => reconcileAssignment(broken.client(), SET, { now: NOW }))
  assert.equal(broken.tables.assignments[0].reconciled_at, null, 'claim released')
}

async function decisions() {
  // A = 6/8 (75%) is held; B = 7/10 (70%) has more raw marks. The teacher confirms B.
  const a = attemptRow({ marks_earned: 6, total_marks: 8, created_at: '2026-09-22T10:00:00.000Z' })
  const b = attemptRow({ marks_earned: 7, total_marks: 10, created_at: '2026-09-23T10:00:00.000Z', assignment_item_id: ITEM_Q3 })
  const db = world({ items: [itemRow({ total_marks: null })], attempts: [a, b] })
  await reconcileAssignment(db.client(), SET, { now: NOW })
  assert.equal(subs(db)[0].attempt_id, a.id, 'fixture: the row holds A')

  db.tables.teacher_overrides = [{ id: newId(), attempt_id: b.id, decision: 'confirm', created_at: '2026-09-25T11:00:00.000Z' }]
  const rows = await resyncSubmissionsForAttempt(db.client(), b.id as string)
  assert.equal(rows.length, 1)
  assert.equal(subs(db)[0].attempt_id, a.id, 'the decision path uses reconcile’s comparator: A still counts')
  assert.equal(subs(db)[0].status, 'submitted', 'A was not the attempt reviewed')
  const before = JSON.stringify(subs(db))
  await reconcileAssignment(db.client(), SET, { now: new Date(NOW.getTime() + 120_000) })
  assert.equal(JSON.stringify(subs(db)), before, 'the next reconcile agrees: nothing flips')

  // The teacher re-marks B up to 9/10: B now counts, reviewed, and reconcile keeps it.
  db.tables.attempts.find((r) => r.id === b.id)!.marks_earned = 9
  db.tables.teacher_overrides.push({ id: newId(), attempt_id: b.id, decision: 'override', created_at: '2026-09-25T11:05:00.000Z' })
  await resyncSubmissionsForAttempt(db.client(), b.id as string)
  assert.equal(subs(db)[0].attempt_id, b.id, 'the raised attempt takes over at once')
  assert.equal(subs(db)[0].marks_earned, 9)
  assert.equal(subs(db)[0].status, 'reviewed')
  const after = JSON.stringify(subs(db))
  await reconcileAssignment(db.client(), SET, { now: new Date(NOW.getTime() + 240_000) })
  assert.equal(JSON.stringify(subs(db)), after, 'and the review survives the next reconcile')

  // An unstamped attempt raised above the held one is picked up by the decision itself.
  const c = attemptRow({ marks_earned: 1, total_marks: 6, created_at: '2026-09-24T10:00:00.000Z' })
  db.tables.attempts.push(c)
  c.marks_earned = 6
  c.total_marks = 6
  db.tables.teacher_overrides.push({ id: newId(), attempt_id: c.id, decision: 'override', created_at: '2026-09-25T11:10:00.000Z' })
  await resyncSubmissionsForAttempt(db.client(), c.id as string)
  assert.equal(subs(db)[0].attempt_id, c.id, 'not held, not stamped — still found through the banked question')
  assert.equal(subs(db)[0].status, 'reviewed')

  assert.deepEqual(await resyncSubmissionsForAttempt(db.client(), 'not-a-uuid'), [])
}

async function writes() {
  // Create: publish, target, items; then the undo when items fail.
  {
    const db = world({ sets: [], items: [] })
    const { assignment, items } = await createAssignmentWithItems(
      db.client(),
      db.client(),
      { classroomId: CLASS, teacherId: TEACHER, subjectCode: '9709' },
      {
        title: ' Week 4 <b>quadratics</b> ',
        kind: 'question_set',
        items: [{ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 's24', question_number: '3' }],
        publish: true,
        due_at: '2026-10-02T16:00:00Z',
        target: { student_ids: [BEN] },
      },
      NOW
    )
    assert.equal(assignment.title, 'Week 4 quadratics')
    assert.equal(assignment.published_at, NOW.toISOString())
    assert.equal(assignment.target, 'students')
    assert.equal(items[0].mark_scheme_id, SCHEME_Q3, 'resolved from the bank')
    assert.deepEqual(db.tables.assignment_students.map((r) => r.student_id), [BEN])
  }
  {
    const db = world({ sets: [], items: [] })
    await assert.rejects(
      () =>
        createAssignmentWithItems(
          db.client(),
          db.client(),
          { classroomId: CLASS, teacherId: TEACHER, subjectCode: '9709' },
          { title: 'x', kind: 'question_set', items: [], publish: false, target: { student_ids: [CARL] } },
          NOW
        ),
      (err: unknown) => err instanceof AssignmentInputError && err.field === 'target',
      'a student who left cannot be targeted'
    )
    await assert.rejects(
      () =>
        createAssignmentWithItems(db.client(), db.client(), { classroomId: CLASS, teacherId: TEACHER, subjectCode: null }, {
          title: 'x',
          kind: 'question_set',
          items: [],
          publish: false,
        }),
      (err: unknown) => err instanceof AssignmentInputError && err.status === 409,
      'a class with no subject'
    )
    db.failing.add('insert:assignment_items')
    await assert.rejects(() =>
      createAssignmentWithItems(
        db.client(),
        db.client(),
        { classroomId: CLASS, teacherId: TEACHER, subjectCode: '9709' },
        {
          title: 'x',
          kind: 'question_set',
          items: [{ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 's24', question_number: '3' }],
          publish: false,
        },
        NOW
      )
    )
    assert.equal(db.tables.assignments.length, 0, 'half a set is removed again')
  }

  // Draft items are replaced; a failed insert puts the old ones back.
  {
    const db = world({ sets: [setRow({ published_at: null })] })
    const draft = (await loadAssignment(db.client(), db.client(), SET))!.assignment
    const { items } = await updateAssignment(db.client(), db.client(), draft, {
      items: [{ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3' }],
      title: 'Renamed',
    })
    assert.equal(items.length, 1)
    assert.equal(db.tables.assignments[0].title, 'Renamed')
    const before = db.tables.assignment_items.map((r) => r.id)
    db.failOnce.add('insert:assignment_items')
    await assert.rejects(() =>
      updateAssignment(db.client(), db.client(), draft, {
        items: [{ item_type: 'prompt', prompt_text: 'Why?' }],
      })
    )
    assert.deepEqual(db.tables.assignment_items.map((r) => r.id), before, 'the old items are put back')
  }

  // Publishing twice tells students once.
  {
    const db = world({ sets: [setRow({ published_at: null, due_at: '2026-10-02T16:00:00.000Z' })] })
    const draft = (await loadAssignment(db.client(), db.client(), SET))!.assignment
    const first = await publishAssignment(db.client(), draft, NOW)
    assert.equal(first.published, true)
    const second = await publishAssignment(db.client(), draft, NOW)
    assert.equal(second.published, false, 'the conditional update refuses the second')
    const past = world({ sets: [setRow({ published_at: null, due_at: '2026-09-20T16:00:00.000Z' })] })
    const pastDraft = (await loadAssignment(past.client(), past.client(), SET))!.assignment
    await assert.rejects(
      () => publishAssignment(past.client(), pastDraft, NOW),
      (err: unknown) => err instanceof AssignmentInputError && err.field === 'due_at'
    )
  }

  // Per-student flags: a picked-students set never gains a student by accident.
  {
    const db = world({ sets: [setRow({ target: 'students' })], flags: [{ assignment_id: SET, student_id: BEN, excused_at: null, extended_due_at: null, feedback: null, feedback_at: null, reminded_at: null }] })
    const set = (await loadAssignment(db.client(), db.client(), SET))!.assignment
    await assert.rejects(
      () => updateStudentFlags(db.client(), set, AMIRA, { excused: true }, NOW),
      (err: unknown) => err instanceof AssignmentInputError && err.status === 404
    )
    await assert.rejects(
      () => updateStudentFlags(db.client(), set, CARL, { excused: true }, NOW),
      (err: unknown) => err instanceof AssignmentInputError && err.status === 404,
      'a student who left'
    )
    const { flags, feedbackChanged } = await updateStudentFlags(db.client(), set, BEN, { excused: true, feedback: 'See me' }, NOW)
    assert.equal(flags.excused_at, NOW.toISOString())
    assert.equal(flags.feedback, 'See me')
    assert.equal(feedbackChanged, true)
    const later = new Date(NOW.getTime() + 60_000)
    const again = await updateStudentFlags(db.client(), set, BEN, { excused: true, feedback: 'See me' }, later)
    assert.equal(again.flags.excused_at, NOW.toISOString(), 'excusing twice keeps the first stamp')
    assert.equal(again.feedbackChanged, false, 'an unchanged note is not re-audited')
  }
}

async function reads() {
  const a = attemptRow({ assignment_item_id: ITEM_Q3 })
  const db = world({
    sets: [
      setRow(),
      setRow({ id: SET_B, title: 'Draft', published_at: null, updated_at: '2026-09-24T00:00:00.000Z' }),
    ],
    attempts: [a],
  })
  await onAttemptsMarked(db.client(), { userId: AMIRA, attemptIds: [a.id as string] })

  const loaded = (await loadAssignment(db.client(), db.client(), SET))!
  assert.equal(loaded.items.length, 2)
  assert.equal(loaded.progress.total_students, 2, 'Carl left before the set: not on it')
  const amira = loaded.progress.students.find((s) => s.student_id === AMIRA)!
  assert.equal(amira.display_name, 'Amira K.')
  assert.deepEqual(amira.items.map((i) => i.state), ['done', 'missing'])

  const open = await listAssignments(db.client(), CLASS, { status: 'open', now: NOW })
  assert.deepEqual(open.assignments.map((s) => s.id), [SET])
  assert.equal(open.assignments[0].item_count, 2)
  assert.equal(open.assignments[0].status, 'open')
  const drafts = await listAssignments(db.client(), CLASS, { status: 'draft', now: NOW })
  assert.deepEqual(drafts.assignments.map((s) => s.id), [SET_B])
  await assert.rejects(
    () => listAssignments(db.client(), CLASS, { status: 'open', cursor: 'garbage', now: NOW }),
    (err: unknown) => err instanceof AssignmentInputError && err.field === 'cursor'
  )

  // A closed set can still be reminded for a student inside their extension, and only them.
  {
    const closedSet = world({
      sets: [setRow({ closed_at: '2026-09-24T00:00:00.000Z' })],
      flags: [{ assignment_id: SET, student_id: BEN, excused_at: null, extended_due_at: '2026-09-28T16:00:00.000Z', feedback: null, feedback_at: null, reminded_at: null }],
    })
    const closedLoaded = (await loadAssignment(closedSet.client(), closedSet.client(), SET))!.assignment as Assignment
    assert.deepEqual(await remindAssignment(closedSet.client(), closedSet.client(), closedLoaded, null, NOW), { sent: 0, eligible: 1 })
    const noExtension = world({ sets: [setRow({ closed_at: '2026-09-24T00:00:00.000Z' })] })
    const plainClosed = (await loadAssignment(noExtension.client(), noExtension.client(), SET))!.assignment as Assignment
    await assert.rejects(
      () => remindAssignment(noExtension.client(), noExtension.client(), plainClosed, null, NOW),
      (err: unknown) => err instanceof AssignmentInputError && err.status === 409
    )
  }

  // Remind: the students who owe work, then the six-hour throttle.
  const set = loaded.assignment as Assignment
  const sent = await remindAssignment(db.client(), db.client(), set, null, NOW)
  assert.deepEqual(sent, { sent: 0, eligible: 2 }, 'both owe work (the notifier cannot reach a database here, so sends 0)')
  assert.ok(db.tables.assignment_students.every((r) => !r.reminded_at), 'a send that reached nobody stamps nothing')
  db.tables.assignment_students.push({ assignment_id: SET, student_id: BEN, reminded_at: '2026-09-25T10:00:00.000Z' })
  await assert.rejects(
    () => remindAssignment(db.client(), db.client(), set, null, NOW),
    (err: unknown) => err instanceof AssignmentInputError && err.status === 429 && err.retryAfterSeconds === 4 * 3600
  )
  await assert.rejects(
    () => remindAssignment(db.client(), db.client(), { ...set, published_at: null }, null, NOW),
    (err: unknown) => err instanceof AssignmentInputError && err.status === 409
  )
}

async function main() {
  // lib/teacher/notify runs for real here and, with no service key in a test,
  // logs that it could not send. That is its contract (never throw); keep the
  // output to what this file is about.
  const error = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[teacher/notify]')) return
    error(...args)
  }
  await gate()
  await hook()
  await reconcile()
  await decisions()
  await writes()
  await reads()
  console.log('server.test.ts: all checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
