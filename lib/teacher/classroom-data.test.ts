import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  attemptColumns,
  chunk,
  countSubmissions,
  fetchAllFiltered,
  getClassroomAttempts,
  getClassroomStudentIds,
  getRosterProfiles,
  getStudentProfiles,
  hydrateSets,
  ID_CHUNK,
  loadPublishedSets,
  toClassroomAttempt,
  type AttemptRow,
  type PageResult,
} from '@/lib/teacher-classroom-data'
import { loadDueRowsForStudents } from '@/lib/teacher/load-due-rows'
import { loadClassWeek } from '@/lib/teacher/week'
import { loadTeacherOverview } from '@/lib/teacher/overview'

// ---------------------------------------------------------------------------
// A small in-memory PostgREST: enough of the query builder for the loaders,
// with PostgREST's habits that matter here — a projection by select string,
// ranges, and a log of every request so paging and chunking can be checked.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>
type LogEntry = { table: string; select?: string; in?: [string, number]; range?: [number, number]; count?: boolean }

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') {
    const x = Date.parse(a)
    const y = Date.parse(b)
    if (Number.isFinite(x) && Number.isFinite(y) && /\d{4}-\d{2}-\d{2}/.test(a)) return x - y
    return a < b ? -1 : a > b ? 1 : 0
  }
  return (a as number) - (b as number)
}

/** Output keys of a select string: `alias:expr` → alias, `embed ( … )` → embed. */
function selectKeys(select: string): string[] {
  const keys: string[] = []
  let depth = 0
  let current = ''
  for (const ch of select) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      keys.push(current)
      current = ''
    } else current += ch
  }
  keys.push(current)
  return keys
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => (k.includes('(') ? k.slice(0, k.indexOf('(')).trim() : k.split(':')[0].trim()))
}

class FakeQuery implements PromiseLike<unknown> {
  private filters: Array<(r: Row) => boolean> = []
  private orders: Array<{ col: string; asc: boolean }> = []
  private window: [number, number] | null = null
  private keys: string[] | null = null
  private head = false
  private single = false
  constructor(
    private db: FakeDb,
    private table: string,
    private source: () => Row[]
  ) {}
  select(columns: string, opts: { count?: string; head?: boolean } = {}) {
    this.keys = columns === '*' ? null : selectKeys(columns)
    this.head = Boolean(opts.head)
    this.db.log.push({ table: this.table, select: columns, count: this.head })
    return this
  }
  in(col: string, values: unknown[]) {
    this.db.log.push({ table: this.table, in: [col, values.length] })
    this.filters.push((r) => values.includes(r[col]))
    return this
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v)
    return this
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v)
    return this
  }
  gte(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) >= 0)
    return this
  }
  lte(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) <= 0)
    return this
  }
  lt(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && compare(r[col], v) < 0)
    return this
  }
  is(col: string, v: null) {
    this.filters.push((r) => r[col] == v)
    return this
  }
  not(col: string, op: 'is', v: null) {
    assert.equal(op, 'is')
    this.filters.push((r) => r[col] != v)
    return this
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orders.push({ col, asc: opts.ascending !== false })
    return this
  }
  range(from: number, to: number) {
    this.window = [from, to]
    this.db.log.push({ table: this.table, range: [from, to] })
    return this
  }
  maybeSingle() {
    this.single = true
    return this
  }
  private result(): Row {
    if (this.db.fail.has(this.table)) return { data: null, error: { message: `${this.table} is down` }, count: null }
    let rows = this.source().filter((r) => this.filters.every((f) => f(r)))
    const count = rows.length
    if (this.head) return { data: null, error: null, count }
    rows = [...rows].sort((a, b) => {
      for (const o of this.orders) {
        const c = compare(a[o.col], b[o.col])
        if (c !== 0) return o.asc ? c : -c
      }
      return 0
    })
    if (this.window) rows = rows.slice(this.window[0], this.window[1] + 1)
    const keys = this.keys
    const out = keys ? rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]))) : rows
    if (this.single) return { data: out[0] ?? null, error: null, count: null }
    return { data: out, error: null, count }
  }
  then<A = unknown, B = never>(
    onfulfilled?: ((value: unknown) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null
  ): PromiseLike<A | B> {
    return Promise.resolve(this.result()).then(onfulfilled, onrejected)
  }
}

class FakeDb {
  log: LogEntry[] = []
  fail = new Set<string>()
  rpcCalls: Array<{ fn: string; args: Row }> = []
  constructor(
    public tables: Record<string, Row[]>,
    private rpcs: Record<string, (args: Row) => Row[]> = {}
  ) {}
  from(table: string) {
    return new FakeQuery(this, table, () => this.tables[table] ?? [])
  }
  /** A set-returning RPC reads like a table named after the function (failures included). */
  rpc(fn: string, args: Row) {
    this.rpcCalls.push({ fn, args })
    return new FakeQuery(this, fn, () => this.rpcs[fn]?.(args) ?? [])
  }
  client(): SupabaseClient {
    return this as unknown as SupabaseClient
  }
  requests(table: string) {
    return this.log.filter((l) => l.table === table)
  }
}

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

async function paging() {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: `r${String(i).padStart(4, '0')}` }))
  const db = new FakeDb({ t: rows })
  const page = (from: number, to: number) =>
    db.from('t').select('id').order('id').range(from, to) as unknown as PromiseLike<PageResult>

  const all = await fetchAllFiltered<{ id: string }>('t', page)
  assert.equal(all.rows.length, 2500, 'past the 1,000-row cap')
  assert.equal(all.truncated, false)
  assert.deepEqual(
    db.requests('t').filter((l) => l.range).map((l) => l.range),
    [
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ],
    'a short page ends it'
  )

  const capped = await fetchAllFiltered<{ id: string }>('t', page, { maxRows: 2000 })
  assert.equal(capped.rows.length, 2000)
  assert.equal(capped.truncated, true, 'more rows exist')
  const exact = await fetchAllFiltered<{ id: string }>('t', page, { maxRows: 2500 })
  assert.equal(exact.truncated, false, 'exactly maxRows is not truncation')
  assert.equal(exact.rows.length, 2500)
  const zero = await fetchAllFiltered<{ id: string }>('t', page, { maxRows: 0 })
  assert.deepEqual(zero, { rows: [], truncated: true })
  const small = await fetchAllFiltered<{ id: string }>('t', page, { pageSize: 700, maxRows: 1500 })
  assert.equal(small.rows.length, 1500)
  assert.equal(small.rows[1499].id, 'r1499', 'pages are contiguous')

  db.fail.add('t')
  await assert.rejects(fetchAllFiltered('t', page), /t: t is down/, 'an error is thrown, never a partial list')

  const db2 = new FakeDb({ t: rows })

  // A page size above the server's cap would read a capped page as the last one.
  const big = await fetchAllFiltered<{ id: string }>('t2', (from, to) => {
    assert.ok(to - from + 1 <= 1000, 'never asks for more than PostgREST returns')
    return db2.from('t').select('id').order('id').range(from, to) as unknown as PromiseLike<PageResult>
  }, { pageSize: 5000 })
  assert.equal(big.rows.length, 2500)

  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.deepEqual(chunk([], 2), [])
  assert.deepEqual(chunk([1, 2], 0), [[1], [2]], 'a zero chunk size cannot loop forever')
}

// ---------------------------------------------------------------------------
// Rows → ClassroomAttempt
// ---------------------------------------------------------------------------

function rows() {
  const full: AttemptRow = {
    id: 'a1',
    user_id: 'amira',
    marks_earned: '3',
    total_marks: 5,
    syllabus_tags: ['1.1', 7 as unknown as string],
    created_at: '2026-09-20T10:00:00Z',
    time_spent_seconds: '42',
    question_text: 'q',
    source_type: 'past_paper',
    mark_scheme_id: 'ms1',
    assignment_item_id: 'item-1',
    am_paper_code: null,
    am_paper_session: null,
    am_style: 'level_of_response',
    am_total_source: 'estimated',
    am_guide_status: 'withdrawn',
    am_teacher_override: 'true',
    am_band_level: '3',
    am_first_criterion: null,
    mark_schemes: [{ paper_code: '9701/22', paper_session: 'm24', question_number: '4' }],
    error_classifications: [{ classification: 'conceptual', mark_id: 'M1', description: 'x' }],
    am_marks: [
      { mark_id: 'M1', type: 'M1', earned: false, error_classification: 'conceptual', reasoning: 'long text' },
      'junk',
      { mark_id: 2, earned: true, teacher_override: true },
    ],
  }
  const a = toClassroomAttempt(full)
  assert.equal(a.marks_earned, 3, 'numeric strings become numbers')
  assert.equal(a.time_spent_seconds, 42)
  assert.deepEqual(a.syllabus_tags, ['1.1'], 'non-string tags are dropped')
  assert.deepEqual(a.mark_schemes, { paper_code: '9701/22', paper_session: 'm24', question_number: '4' }, 'array embeds unwrap')
  assert.equal(a.ai_marking?.marking_style, 'level_of_response')
  assert.equal(a.ai_marking?.total_marks_source, 'estimated')
  assert.deepEqual(a.ai_marking?.guide_notice, { status: 'withdrawn' })
  assert.equal(a.ai_marking?.teacher_override, true)
  assert.equal(a.ai_marking?.judgement_marking, true, 'a band level marks a judgement')
  assert.deepEqual(a.ai_marking?.marks_awarded, [
    { mark_id: 'M1', type: 'M1', earned: false, margin_note: null, error_classification: 'conceptual', teacher_override: null },
    { mark_id: 2, type: null, earned: true, margin_note: null, error_classification: null, teacher_override: true },
  ])
  assert.equal(a.error_classifications?.length, 1)
  assert.equal(a.assignment_item_id, 'item-1')

  const lean = toClassroomAttempt({
    id: 'a2',
    user_id: 'ben',
    marks_earned: null,
    total_marks: null,
    syllabus_tags: null,
    created_at: '2026-09-20T10:00:00Z',
    am_paper_code: '9701/42',
    am_first_criterion: 'A',
  })
  assert.equal(lean.total_marks, 0, 'a missing mark or total is "no usable total", which analytics skip')
  assert.equal(
    toClassroomAttempt({ id: 'a3', user_id: 'b', marks_earned: null, total_marks: 8, syllabus_tags: null, created_at: 'x' })
      .total_marks,
    0,
    'an unmarked attempt with a known total is not 0%'
  )
  assert.equal(lean.ai_marking?.paper_code, '9701/42')
  assert.equal(lean.ai_marking?.marks_awarded, undefined, 'no per-mark detail unless it was read')
  assert.equal(lean.error_classifications, undefined)
  assert.equal(lean.ai_marking?.judgement_marking, true, 'a criterion marks a judgement')
  assert.equal(lean.mark_schemes, null)

  assert.ok(attemptColumns(true).includes('am_marks:ai_marking->marks_awarded'))
  assert.ok(!attemptColumns(false).includes('marks_awarded'), 'the heavy path is opt-in')
  assert.ok(!attemptColumns(true).includes('ai_marking,') && !/\bai_marking\s*(,|$)/.test(attemptColumns(true)), 'never the whole ai_marking column')
}

// ---------------------------------------------------------------------------
// A Chemistry class in the database
// ---------------------------------------------------------------------------

const NOW = new Date('2026-09-25T12:00:00.000Z')

function attemptRow(id: string, user: string, created: string, earned: number, total: number, tags: string[], extra: Row = {}): Row {
  return {
    id,
    user_id: user,
    marks_earned: earned,
    total_marks: total,
    syllabus_tags: tags,
    created_at: created,
    time_spent_seconds: 60,
    question_text: null,
    source_type: 'other',
    mark_scheme_id: null,
    assignment_item_id: null,
    am_paper_code: null,
    mark_schemes: null,
    ...extra,
  }
}

function classDb() {
  return new FakeDb(
    {
      classrooms: [
        { id: 'chem', teacher_id: 't1', name: 'Year 12 Chemistry', board: 'Cambridge International', level: 'A-Level', subject_code: '9701', archived_at: null, created_at: '2026-08-01T00:00:00Z' },
        { id: 'phys', teacher_id: 't1', name: 'Year 12 Physics', board: 'Cambridge International', level: 'A-Level', subject_code: '9702', archived_at: null, created_at: '2026-08-02T00:00:00Z' },
        { id: 'old', teacher_id: 't1', name: 'Old class', board: 'Cambridge International', level: 'A-Level', subject_code: '9701', archived_at: '2026-06-01T00:00:00Z', created_at: '2025-08-01T00:00:00Z' },
      ],
      classroom_memberships: [
        { classroom_id: 'chem', student_id: 'amira', status: 'active', joined_at: '2026-09-01T00:00:00Z', left_at: null, removed_at: null },
        { classroom_id: 'chem', student_id: 'ben', status: 'active', joined_at: '2026-09-10T00:00:00Z', left_at: null, removed_at: null },
        { classroom_id: 'chem', student_id: 'cara', status: 'left', joined_at: '2026-09-01T00:00:00Z', left_at: '2026-09-20T00:00:00Z', removed_at: null },
        { classroom_id: 'phys', student_id: 'amira', status: 'active', joined_at: '2026-09-01T00:00:00Z', left_at: null, removed_at: null },
        { classroom_id: 'old', student_id: 'dev', status: 'active', joined_at: '2025-09-01T00:00:00Z', left_at: null, removed_at: null },
      ],
      attempts: [
        attemptRow('x1', 'amira', '2026-08-20T10:00:00Z', 1, 5, ['37.1']), // before joining
        attemptRow('x2', 'amira', '2026-09-20T10:00:00Z', 1, 5, ['37.1']), // chemistry
        attemptRow('x3', 'amira', '2026-09-21T10:00:00Z', 2, 5, ['37.1']),
        attemptRow('x4', 'amira', '2026-09-22T10:00:00Z', 3, 5, ['23.1']), // 9701/9702 tie
        attemptRow('x5', 'amira', '2026-09-23T10:00:00Z', 4, 5, ['23.1'], { mark_scheme_id: 'ms-phys' }), // physics paper
        attemptRow('x6', 'ben', '2026-09-09T10:00:00Z', 5, 5, ['37.1']), // before Ben joined
        attemptRow('x7', 'ben', '2026-09-24T10:00:00Z', 1, 10, ['37.1']),
        attemptRow('x8', 'cara', '2026-09-15T10:00:00Z', 5, 5, ['37.1']), // left
        attemptRow('x9', 'amira', '2026-09-24T11:00:00Z', 4, 8, ['1.1'], { am_paper_code: '9702/42' }), // physics whole paper
      ],
      mark_schemes: [{ id: 'ms-phys', paper_code: '9702/22', paper_session: 'm24', question_number: '2' }],
      assignments: [
        { id: 'set-due', classroom_id: 'chem', title: 'Moles quiz', kind: 'question_set', subject_code: '9701', is_mock: false, target: 'all', due_at: '2026-09-23T16:00:00Z', published_at: '2026-09-18T09:00:00Z', closed_at: null, archived_at: null, created_at: '2026-09-18T08:00:00Z' },
        { id: 'set-open', classroom_id: 'chem', title: 'Isotopes', kind: 'question_set', subject_code: '9701', is_mock: false, target: 'all', due_at: '2026-09-29T16:00:00Z', published_at: '2026-09-24T09:00:00Z', closed_at: null, archived_at: null, created_at: '2026-09-24T08:00:00Z' },
        { id: 'set-draft', classroom_id: 'chem', title: 'Draft', kind: 'question_set', subject_code: '9701', is_mock: false, target: 'all', due_at: null, published_at: null, closed_at: null, archived_at: null, created_at: '2026-09-24T08:00:00Z' },
        { id: 'set-gone', classroom_id: 'chem', title: 'Archived', kind: 'question_set', subject_code: '9701', is_mock: false, target: 'all', due_at: null, published_at: '2026-09-01T09:00:00Z', closed_at: null, archived_at: '2026-09-02T00:00:00Z', created_at: '2026-09-01T08:00:00Z' },
      ],
      assignment_items: [
        { id: 'i1', assignment_id: 'set-due', position: 0, item_type: 'past_paper_question', mark_scheme_id: 'ms1', paper_code: '9701/22', paper_session: 'm24', question_number: '1', total_marks: '5', syllabus_tags: ['2.2'], topic_code: null, prompt_text: null, ib_component_key: null },
        { id: 'i2', assignment_id: 'set-open', position: 0, item_type: 'past_paper_question', mark_scheme_id: 'ms2', paper_code: '9701/22', paper_session: 'm24', question_number: '2', total_marks: 5, syllabus_tags: ['1.2'], topic_code: null, prompt_text: null, ib_component_key: null },
      ],
      assignment_students: [],
      assignment_submissions: [
        { id: 'sub1', assignment_id: 'set-due', item_id: 'i1', student_id: 'amira', attempt_id: 'x3', attempt_count: 1, marks_earned: '2', total_marks: 5, status: 'submitted', source: 'linked', first_submitted_at: '2026-09-21T10:00:00Z', last_submitted_at: '2026-09-21T10:00:00Z' },
        { id: 'sub2', assignment_id: 'set-due', item_id: 'i1', student_id: 'ben', attempt_id: 'x7', attempt_count: 1, marks_earned: 1, total_marks: 10, status: 'reviewed', source: 'reconciled', first_submitted_at: '2026-09-24T10:00:00Z', last_submitted_at: '2026-09-24T10:00:00Z' },
      ],
    },
    {
      teacher_student_profiles: (args) =>
        (args.p_student_ids as string[])
          .filter((id) => ['amira', 'ben'].includes(id))
          .map((id) => ({ id, full_name: id === 'amira' ? 'Amira Khan' : 'Ben Osei', board: 'Cambridge International', level: 'A-Level' })),
      teacher_roster_profiles: (args) =>
        args.p_classroom_id === 'chem'
          ? [
              { id: 'amira', full_name: 'Amira Khan', board: null, level: null, joined_at: '2026-09-01T00:00:00Z', status: 'active' },
              { id: 'ben', full_name: 'Ben Osei', board: null, level: null, joined_at: '2026-09-10T00:00:00Z', status: 'active' },
              { id: 'cara', full_name: 'Cara Lee', board: null, level: null, joined_at: '2026-09-01T00:00:00Z', status: 'left' },
            ]
          : [],
    }
  )
}

async function classroomReads() {
  const db = classDb()
  const supabase = db.client()

  assert.deepEqual(await getClassroomStudentIds(supabase, 'chem'), ['amira', 'ben'], 'active members by default')
  assert.deepEqual(
    await getClassroomStudentIds(supabase, 'chem', { status: ['active', 'left'] }),
    ['amira', 'ben', 'cara']
  )

  const read = await getClassroomAttempts(supabase, 'chem', { withMarking: false })
  assert.deepEqual(read.studentIds, ['amira', 'ben'])
  assert.deepEqual(
    read.attempts.map((a) => a.id),
    ['x7', 'x5', 'x4', 'x3', 'x2'],
    "newest first; the classroom's subject (from its row), since each join, active members only"
  )
  assert.equal(read.truncated, false)
  const attemptSelect = db.requests('attempts').find((l) => l.select)!.select!
  assert.ok(!attemptSelect.includes('marks_awarded'), 'withMarking: false skips the per-mark payload')

  // With a scheme lookup, x5 is placed by its paper (9702) instead of its tied tags.
  const admin = new FakeDb({ mark_schemes: db.tables.mark_schemes }).client()
  const exact = await getClassroomAttempts(supabase, 'chem', { admin })
  assert.deepEqual(exact.attempts.map((a) => a.id), ['x7', 'x4', 'x3', 'x2'])
  assert.equal(exact.attempts[0].ai_marking?.marks_awarded, null, 'per-mark detail read by default')

  const physics = await getClassroomAttempts(supabase, 'phys', { admin })
  assert.deepEqual(physics.attempts.map((a) => a.id), ['x9', 'x5', 'x4'], 'the same student, the other class')

  const early = await getClassroomAttempts(supabase, 'chem', { subjectCode: '9701', sinceJoin: false, withMarking: false })
  assert.ok(early.attempts.some((a) => a.id === 'x1') && early.attempts.some((a) => a.id === 'x6'))
  assert.ok(!early.attempts.some((a) => a.id === 'x8'), 'still active members only')

  const window = await getClassroomAttempts(supabase, 'chem', {
    since: '2026-09-21T00:00:00Z',
    until: '2026-09-22T23:59:59Z',
    withMarking: false,
  })
  assert.deepEqual(window.attempts.map((a) => a.id), ['x4', 'x3'])

  const limited = await getClassroomAttempts(supabase, 'chem', { limit: 2, withMarking: false })
  assert.equal(limited.truncated, true, 'told, not hidden')
  assert.ok(limited.attempts.length <= 2)

  const unknown = await getClassroomAttempts(supabase, 'nope')
  assert.deepEqual(unknown, { attempts: [], truncated: false, studentIds: [] })

  // Big rosters are chunked.
  const many = Array.from({ length: 250 }, (_, i) => ({
    classroom_id: 'big',
    student_id: `s${String(i).padStart(3, '0')}`,
    status: 'active',
    joined_at: '2026-09-01T00:00:00Z',
    left_at: null,
    removed_at: null,
  }))
  const big = new FakeDb({ classroom_memberships: many, attempts: [] })
  await getClassroomAttempts(big.client(), 'big', { subjectCode: null })
  const ins = big.requests('attempts').filter((l) => l.in).map((l) => l.in![1])
  assert.deepEqual(ins, [ID_CHUNK, ID_CHUNK, 50], 'no request names more than ID_CHUNK students')

  // Names only through the RPC.
  const names = await getStudentProfiles(supabase, ['amira', 'ben', 'cara', 'amira'])
  assert.deepEqual([...names.keys()], ['amira', 'ben'], "a student who left is not the teacher's to name here")
  assert.equal(names.get('amira')!.full_name, 'Amira Khan')
  assert.deepEqual(db.rpcCalls.at(-1), { fn: 'teacher_student_profiles', args: { p_student_ids: ['amira', 'ben', 'cara'] } })
  assert.ok(!db.log.some((l) => l.table === 'user_profiles'), 'never a direct user_profiles read')
  assert.equal((await getStudentProfiles(supabase, [])).size, 0)
  db.fail.add('teacher_student_profiles')
  await assert.rejects(getStudentProfiles(supabase, ['amira']), /teacher_student_profiles/)
  db.fail.delete('teacher_student_profiles')

  const roster = await getRosterProfiles(supabase, 'chem')
  assert.deepEqual(roster.map((r) => [r.id, r.status]), [['amira', 'active'], ['ben', 'active'], ['cara', 'left']])

  // Sets.
  const published = await loadPublishedSets(supabase, ['chem'])
  assert.deepEqual(published.map((s) => s.id).sort(), ['set-due', 'set-open'], 'no drafts, no archived sets')
  const hydrated = await hydrateSets(supabase, published)
  const due = hydrated.find((s) => s.id === 'set-due')!
  assert.equal(due.items[0].total_marks, 5, 'numeric columns are numbers')
  assert.equal(due.submissions.find((s) => s.student_id === 'amira')!.marks_earned, 2)
  assert.deepEqual(hydrated.find((s) => s.id === 'set-open')!.submissions, [])
  assert.equal(await countSubmissions(supabase, ['set-due', 'set-open'], { unreviewed: true }), 1)
  assert.equal(
    await countSubmissions(supabase, ['set-due'], { firstFrom: '2026-09-24T00:00:00Z', firstTo: '2026-09-25T00:00:00Z' }),
    1
  )
  assert.equal(await countSubmissions(supabase, []), 0)
}

// ---------------------------------------------------------------------------
// Due rows
// ---------------------------------------------------------------------------

async function dueRows() {
  const db = new FakeDb({
    review_schedule: [
      { user_id: 'amira', subject_code: '9701', topic_code: '1.1', due_at: '2026-09-24T00:00:00Z', last_reviewed_at: '2026-09-10T00:00:00Z' },
      { user_id: 'amira', subject_code: '9709', topic_code: '1.1', due_at: '2026-09-24T00:00:00Z', last_reviewed_at: '2026-09-10T00:00:00Z' },
      { user_id: 'ben', subject_code: '9701', topic_code: '2.1', due_at: '2026-09-24T00:00:00Z', last_reviewed_at: '2026-09-05T00:00:00Z' },
    ],
    lesson_recall: [
      { user_id: 'ben', subject_code: '9701', lesson_slug: 'moles', topic_code: '2.2', answered_count: 2, total_count: 2, due_at: '2026-09-23T00:00:00Z', last_worked_at: '2026-09-21T00:00:00Z' },
    ],
  })
  const { rows, error } = await loadDueRowsForStudents(db.client(), ['amira', 'ben'], {
    subjectCode: '9701',
    joinedAt: new Map([
      ['amira', '2026-09-01T00:00:00Z'],
      ['ben', '2026-09-10T00:00:00Z'],
    ]),
    nowMs: NOW.getTime(),
  })
  assert.equal(error, null)
  assert.deepEqual(rows.map((r) => `${r.userId}:${r.subjectCode}:${r.topicCode}:${r.source}`).sort(), [
    'amira:9701:1.1:attempts',
    'ben:9701:2.2:recall',
  ])
  assert.deepEqual(await loadDueRowsForStudents(db.client(), []), { rows: [], error: null })
  db.fail.add('lesson_recall')
  const failed = await loadDueRowsForStudents(db.client(), ['amira'])
  assert.deepEqual(failed.rows, [])
  assert.match(failed.error ?? '', /lesson_recall/, 'a read error is reported, not a partial list')
}

// ---------------------------------------------------------------------------
// Week and desk loaders, end to end
// ---------------------------------------------------------------------------

async function loaders() {
  const db = classDb()
  const supabase = db.client()

  const week = await loadClassWeek(supabase, 'chem', { now: NOW })
  assert.ok(week)
  assert.equal(week.week, '2026-W39')
  assert.deepEqual(week.assignments.map((a) => a.id), ['set-due', 'set-open'])
  const due = week.assignments[0]
  assert.equal(due.handed_in, 2)
  assert.equal(due.late, 1, 'Ben handed in after the deadline')
  assert.equal(due.total_students, 3, 'Cara left after it was set: shown, as LEFT')
  assert.equal(week.submissions_delta, 2)
  assert.equal(week.unreviewed, 1, "Amira's hand-in is not reviewed; Ben's is")
  assert.deepEqual(week.struggling, [
    { id: 'ben', display_name: 'Ben O.', pct: 10 },
  ])
  assert.deepEqual(week.silent_students, [])
  assert.equal(await loadClassWeek(supabase, 'nope', { now: NOW }), null)
  await assert.rejects(loadClassWeek(supabase, 'chem', { week: '2026-W99' }), RangeError)
  assert.ok(!db.log.some((l) => l.table === 'user_profiles'), 'names came from the roster RPC')

  const desk = await loadTeacherOverview(supabase, 't1', { now: NOW })
  assert.deepEqual(desk.classes.map((c) => [c.id, c.archived]), [
    ['phys', false],
    ['chem', false],
    ['old', true],
  ])
  const chem = desk.classes.find((c) => c.id === 'chem')!
  assert.equal(chem.members, 2)
  assert.equal(chem.open_assignments, 2)
  assert.equal(chem.due_this_week, 1)
  assert.equal(chem.unreviewed, 1)
  assert.equal(chem.late_students, 0, 'both handed in the set that is due')
  assert.equal(desk.classes.find((c) => c.id === 'old')!.members, 1)
  assert.equal(desk.needs_you.silent_classes, 0, 'Amira marked physics work this week')

  const empty = await loadTeacherOverview(new FakeDb({ classrooms: [] }).client(), 't2', { now: NOW })
  assert.deepEqual(empty, { classes: [], needs_you: { unreviewed: 0, late_students: 0, silent_classes: 0 } })
}

async function main() {
  await paging()
  rows()
  await classroomReads()
  await dueRows()
  await loaders()
  console.log('classroom-data.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
