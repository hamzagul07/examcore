import assert from 'node:assert/strict'
import { REVIEW_REASON } from '@/lib/teacher/review-priority'
import type { ClassroomAttempt, ClassroomMember } from '@/lib/teacher-analytics'
import {
  DEFAULT_REVIEW_PAGE,
  EMPTY_REVIEW_FILTERS,
  MAX_REVIEW_PAGE,
  aiJudgementSummary,
  assembleReviewQueue,
  compareReviewOrder,
  countReviewStatuses,
  decodeReviewCursor,
  encodeReviewCursor,
  hasReviewFilters,
  letterGradesFor,
  pageReviewItems,
  parseReviewFilters,
  parseReviewLimit,
  reviewDetailHref,
  reviewFilterQuery,
  reviewNeighbours,
  reviewStatusOf,
  reviewWorkLabel,
  reviewsInboxHref,
  sortReviewItems,
  studentBaselines,
  type ReviewClass,
  type ReviewFilters,
  type ReviewOrderKey,
  type ReviewSet,
} from '@/lib/teacher/reviews-query'

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`

// --- filters ------------------------------------------------------------------------------------

{
  const CLASS = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
  const parsed = parseReviewFilters({ classroom_id: CLASS, student_id: '', assignment_id: undefined, status: 'flagged' })
  assert.deepEqual(parsed, {
    ok: true,
    value: { classroom_id: CLASS.toLowerCase(), student_id: null, assignment_id: null, status: 'flagged' },
  })
  // What a GET form sends for "All": empty values, and status=all.
  assert.deepEqual(parseReviewFilters(new URLSearchParams('classroom_id=&student_id=&assignment_id=&status=')), {
    ok: true,
    value: EMPTY_REVIEW_FILTERS,
  })
  assert.deepEqual(parseReviewFilters({ status: 'all' }), { ok: true, value: EMPTY_REVIEW_FILTERS })
  // Repeated params: the first wins.
  assert.equal((parseReviewFilters({ status: ['pending', 'flagged'] }) as { value: ReviewFilters }).value.status, 'pending')
  for (const [key, value] of [
    ['classroom_id', '1'],
    ['student_id', "' or 1=1 --"],
    ['assignment_id', `${uuid(1)},id.neq.x`],
    ['status', 'reviewed'],
    ['status', 'PENDING'],
  ] as const) {
    const r = parseReviewFilters({ [key]: value })
    assert.equal(r.ok, false, `${key}=${value} must be refused`)
    if (!r.ok) assert.equal(r.field, key)
  }
  assert.equal(hasReviewFilters(EMPTY_REVIEW_FILTERS), false)
  assert.equal(hasReviewFilters({ ...EMPTY_REVIEW_FILTERS, status: 'pending' }), true)
}

assert.equal(parseReviewLimit(null), DEFAULT_REVIEW_PAGE)
assert.equal(parseReviewLimit('0'), DEFAULT_REVIEW_PAGE)
assert.equal(parseReviewLimit('-3'), DEFAULT_REVIEW_PAGE)
assert.equal(parseReviewLimit('abc'), DEFAULT_REVIEW_PAGE)
assert.equal(parseReviewLimit('5'), 5)
assert.equal(parseReviewLimit('500'), MAX_REVIEW_PAGE, 'limit ≤ 50')

{
  const f: ReviewFilters = { classroom_id: uuid(1), student_id: null, assignment_id: uuid(2), status: 'pending' }
  // A fixed key order, so the same filter is always the same URL.
  assert.equal(reviewFilterQuery(f), `classroom_id=${uuid(1)}&assignment_id=${uuid(2)}&status=pending`)
  assert.equal(reviewFilterQuery(f, { cursor: 'abc', limit: 5 }), `classroom_id=${uuid(1)}&assignment_id=${uuid(2)}&status=pending&limit=5&cursor=abc`)
  assert.equal(reviewFilterQuery(EMPTY_REVIEW_FILTERS), '')
  assert.equal(reviewsInboxHref(EMPTY_REVIEW_FILTERS), '/teacher/reviews')
  assert.equal(reviewsInboxHref(f), `/teacher/reviews?classroom_id=${uuid(1)}&assignment_id=${uuid(2)}&status=pending`)
  assert.equal(reviewDetailHref(uuid(9), EMPTY_REVIEW_FILTERS), `/teacher/reviews/${uuid(9)}`)
  assert.equal(reviewDetailHref(uuid(9), f), `/teacher/reviews/${uuid(9)}?classroom_id=${uuid(1)}&assignment_id=${uuid(2)}&status=pending`)
}

// --- cursor encoding --------------------------------------------------------------------------------

{
  const key: ReviewOrderKey = { priority: 40, created_at: '2026-09-20T10:15:00.123Z', attempt_id: uuid(7) }
  const token = encodeReviewCursor(key)
  assert.match(token, /^[A-Za-z0-9_-]+$/, 'URL-safe, no padding')
  assert.deepEqual(decodeReviewCursor(token), key, 'round trip')
  assert.deepEqual(
    decodeReviewCursor(encodeReviewCursor({ ...key, attempt_id: uuid(7).toUpperCase() })),
    key,
    'ids come back lower-case'
  )
  assert.deepEqual(
    decodeReviewCursor(encodeReviewCursor({ priority: 0, created_at: '2026-09-20T10:15:00+01:00', attempt_id: uuid(1) })),
    { priority: 0, created_at: '2026-09-20T10:15:00+01:00', attempt_id: uuid(1) },
    'an explicit offset is an instant'
  )

  const forge = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
  const bad: Array<[string, unknown]> = [
    ['empty', ''],
    ['null', null],
    ['not base64url', 'a+b/c='],
    ['not JSON', Buffer.from('not json').toString('base64url')],
    ['object', forge({ priority: 1, created_at: key.created_at, attempt_id: key.attempt_id })],
    ['short', forge([40, key.created_at])],
    ['long', forge([40, key.created_at, key.attempt_id, 'x'])],
    ['priority > 100', forge([101, key.created_at, key.attempt_id])],
    ['negative priority', forge([-1, key.created_at, key.attempt_id])],
    ['fractional priority', forge([40.5, key.created_at, key.attempt_id])],
    ['priority as text', forge(['40', key.created_at, key.attempt_id])],
    ['date without a zone', forge([40, '2026-09-20T10:15:00', key.attempt_id])],
    ['a filter smuggled into the date', forge([40, `${key.created_at}",id.neq."x`, key.attempt_id])],
    ['impossible date', forge([40, '2026-13-45T99:99:99Z', key.attempt_id])],
    ['id not a uuid', forge([40, key.created_at, 'abc'])],
    ['oversized', 'A'.repeat(201)],
  ]
  for (const [label, raw] of bad) {
    assert.equal(decodeReviewCursor(raw as string | null), null, `a forged cursor is refused: ${label}`)
  }
}

// --- order, pages, neighbours --------------------------------------------------------------------------

{
  const a = { priority: 40, created_at: '2026-09-01T00:00:00Z', attempt_id: uuid(1) }
  const b = { priority: 20, created_at: '2026-09-09T00:00:00Z', attempt_id: uuid(2) }
  const c = { priority: 20, created_at: '2026-09-10T00:00:00Z', attempt_id: uuid(3) }
  const d = { priority: 20, created_at: '2026-09-10T00:00:00Z', attempt_id: uuid(4) }
  assert.ok(compareReviewOrder(a, b) < 0, 'higher priority first, however old')
  assert.ok(compareReviewOrder(c, b) < 0, 'then newest first')
  assert.ok(compareReviewOrder(d, c) < 0, 'then attempt id, descending')
  assert.equal(compareReviewOrder(c, c), 0)
  assert.deepEqual(sortReviewItems([b, d, a, c]), [a, d, c, b])
  // Antisymmetric over every pair: a total order.
  for (const x of [a, b, c, d]) {
    for (const y of [a, b, c, d]) assert.equal(Math.sign(compareReviewOrder(x, y)) + Math.sign(compareReviewOrder(y, x)), 0)
  }
}

{
  // 23 scripts with plenty of ties: every page size walks the whole list once, in order.
  const items = sortReviewItems(
    Array.from({ length: 23 }, (_, i) => ({
      priority: [0, 15, 40][i % 3] as number,
      created_at: `2026-09-${String(10 + (i % 4)).padStart(2, '0')}T08:00:00Z`,
      attempt_id: uuid(100 + i),
    }))
  )
  for (const size of [1, 5, 7, 20, 23, 50]) {
    const seen: string[] = []
    let cursor: ReviewOrderKey | null = null
    for (let guard = 0; guard < 100; guard += 1) {
      const page = pageReviewItems(items, cursor, size)
      assert.ok(page.items.length <= size)
      seen.push(...page.items.map((i) => i.attempt_id))
      if (!page.next_cursor) break
      cursor = decodeReviewCursor(page.next_cursor)
      assert.ok(cursor, 'next_cursor decodes')
    }
    assert.deepEqual(seen, items.map((i) => i.attempt_id), `page size ${size} sees every script once, in order`)
  }
  // The last page has no next cursor; a cursor past the end is an empty page.
  assert.equal(pageReviewItems(items, null, 23).next_cursor, null)
  assert.equal(pageReviewItems(items, null, 22).next_cursor !== null, true)
  const last = items[items.length - 1]!
  assert.deepEqual(pageReviewItems(items, last, 10), { items: [], next_cursor: null })
  // A script that disappears between pages (decided, say) does not derail the walk.
  const page1 = pageReviewItems(items, null, 5)
  const gone = decodeReviewCursor(page1.next_cursor)!
  const without = items.filter((i) => i.attempt_id !== gone.attempt_id)
  assert.deepEqual(pageReviewItems(without, gone, 5).items, items.slice(5, 10))
  // Page size is clamped.
  assert.equal(pageReviewItems(items, null, 0).items.length, Math.min(DEFAULT_REVIEW_PAGE, items.length))
  assert.equal(pageReviewItems(items, null, 1000).items.length, Math.min(MAX_REVIEW_PAGE, items.length))

  // Neighbours within the filter.
  const mid = reviewNeighbours(items, items[4]!.attempt_id, null)
  assert.equal(mid.prev, items[3])
  assert.equal(mid.next, items[5])
  assert.equal(mid.index, 4)
  assert.equal(mid.total, 23)
  assert.equal(reviewNeighbours(items, items[0]!.attempt_id, null).prev, null)
  assert.equal(reviewNeighbours(items, last.attempt_id, null).next, null)
  // Not in the list (it left the "pending" filter once decided): placed by its key.
  const outside = reviewNeighbours(without, gone.attempt_id, gone)
  assert.equal(outside.index, null)
  assert.equal(outside.prev, items[3])
  assert.equal(outside.next, items[5])
  assert.equal(reviewNeighbours(items, uuid(999), null).next, items[0], 'no key: start of the list')
  assert.deepEqual(reviewNeighbours([], uuid(1), gone), { prev: null, next: null, index: null, total: 0 })
}

// --- statuses and counts --------------------------------------------------------------------------------

assert.equal(reviewStatusOf(null), 'pending')
assert.equal(reviewStatusOf('confirm'), 'confirmed')
assert.equal(reviewStatusOf('override'), 'overridden')
assert.equal(reviewStatusOf('flag'), 'flagged')
assert.deepEqual(countReviewStatuses([{ status: 'pending' }, { status: 'pending' }, { status: 'flagged' }]), {
  pending: 2,
  confirmed: 0,
  overridden: 0,
  flagged: 1,
  total: 3,
})

// --- small row helpers ------------------------------------------------------------------------------------

{
  const base = { user_id: 's1', total_marks: 10 }
  const b = studentBaselines([
    { id: 'a', marks_earned: 10, ...base },
    { id: 'b', marks_earned: 5, ...base },
    { id: 'c', marks_earned: 0, ...base },
    { id: 'd', marks_earned: 3, user_id: 's1', total_marks: 0 },
    { id: 'e', marks_earned: 4, user_id: 's2', total_marks: 8 },
  ])
  assert.deepEqual(b.get('a'), { mean_pct: 25, count: 2 }, 'the script itself is left out of its baseline')
  assert.deepEqual(b.get('c'), { mean_pct: 75, count: 2 })
  assert.deepEqual(b.get('d'), { mean_pct: 50, count: 3 }, 'a script with no total has the whole baseline')
  assert.deepEqual(b.get('e'), { mean_pct: null, count: 0 }, "a student's only script has none")
}

assert.equal(letterGradesFor({ board: 'Cambridge International', subject_code: '9709' }), true)
assert.equal(letterGradesFor({ board: 'IB', subject_code: null }), false)
assert.equal(letterGradesFor({ board: 'Cambridge International', subject_code: 'ib-math-aa-hl' }), false, 'the subject code wins')
assert.equal(letterGradesFor({ board: 'AP', subject_code: null }), false)
assert.equal(letterGradesFor({}), true)

assert.equal(reviewWorkLabel({ setTitle: '  Algebra\n drill ', paperCode: '9709/12', questionNumber: '3' }), 'Algebra drill')
assert.equal(reviewWorkLabel({ paperCode: '9709/12', questionNumber: 'Q3' }), '9709/12 Q3')
assert.equal(reviewWorkLabel({ paperCode: '9709/12' }), '9709/12')
assert.equal(reviewWorkLabel({}), null)
assert.equal(reviewWorkLabel({ setTitle: 'x'.repeat(200) })?.length, 80)

assert.deepEqual(aiJudgementSummary({ band_result: { level: 3, marks_awarded: 6, marks_available: 9 } }), [
  { label: 'Band', value: 'Level 3' },
  { label: 'Band marks', value: '6/9' },
])
assert.deepEqual(
  aiJudgementSummary({
    criteria_results: [
      { criterion: 'A', criterion_name: 'Knowledge', marks_awarded: 4, marks_available: 6 },
      { criterion: 'B', marks_awarded: '3', marks_available: 4 },
      { criterion: 'C' },
      'junk',
    ],
  }),
  [
    { label: 'A · Knowledge', value: '4/6' },
    { label: 'Criterion B', value: '3/4' },
  ]
)
assert.deepEqual(aiJudgementSummary({ mcq_breakdown: [{ correct: true }, { correct: false }, { correct: true }] }), [
  { label: 'Correct answers', value: '2/3' },
])
assert.deepEqual(aiJudgementSummary({ marks_awarded: [{ mark_id: 1 }] }), [])
assert.deepEqual(aiJudgementSummary(null), [])

// --- assembly: scope, claim, filter, score, sort ------------------------------------------------------------

const CA = uuid(0xa)
const CC = uuid(0xc)
const CB = uuid(0xb)
const S1 = uuid(0x51)
const S2 = uuid(0x52)
const S3 = uuid(0x53)
const SET_X = uuid(0x71)
const SET_Y = uuid(0x72)

const classA: ReviewClass = { id: CA, name: '12A Maths', subject_code: '9709', board: 'Cambridge International', archived_at: null }
const classC: ReviewClass = { id: CC, name: '12C Maths', subject_code: '9709', board: 'Cambridge International', archived_at: null }
const classB: ReviewClass = { id: CB, name: 'IB HL', subject_code: 'ib-math-aa-hl', board: 'IB', archived_at: null }

const member = (student_id: string, joined_at: string): ClassroomMember => ({ student_id, status: 'active', joined_at })
const members = new Map<string, ClassroomMember[]>([
  [CA, [member(S1, '2026-09-01T00:00:00Z'), member(S2, '2026-09-10T00:00:00Z')]],
  [CC, [member(S1, '2026-09-01T00:00:00Z')]],
  [CB, [member(S1, '2026-09-01T00:00:00Z')]],
])

const maths = { paper_code: '9709/12', paper_session: 'm24', question_number: '3' }
const chem = { paper_code: '9701/22', paper_session: 'm24', question_number: '1' }
function att(n: number, over: Partial<ClassroomAttempt> & { user_id: string; created_at: string }): ClassroomAttempt {
  return {
    id: uuid(n),
    marks_earned: 6,
    total_marks: 8,
    syllabus_tags: null,
    question_text: 'Differentiate $x^3 + 2x$ with respect to $x$.',
    mark_schemes: maths,
    ai_marking: { marks_awarded: [] },
    error_classifications: null,
    ...over,
  }
}

const a1 = att(1, { user_id: S1, created_at: '2026-09-05T09:00:00Z' }) // 9709 — A and C both accept; A is listed first
const a2 = att(2, { user_id: S2, created_at: '2026-09-05T09:00:00Z' }) // before S2 joined A
const a3 = att(3, { user_id: S2, created_at: '2026-09-12T09:00:00Z' }) // A
const a4 = att(4, {
  user_id: S1,
  created_at: '2026-09-06T09:00:00Z',
  mark_schemes: null,
  ai_marking: { paper_code: 'ib-math-aa-hl/1', marks_awarded: [] },
}) // IB class
const a5 = att(5, { user_id: S1, created_at: '2026-09-07T09:00:00Z', mark_schemes: chem }) // no class teaches Chemistry
const a6 = att(6, { user_id: S3, created_at: '2026-09-08T09:00:00Z' }) // not a member
const a7 = att(7, { user_id: S2, created_at: '2026-09-15T09:00:00Z', mark_schemes: chem }) // Chemistry, but handed in to A's set
const a8 = att(8, { user_id: S1, created_at: '2026-09-16T09:00:00Z' }) // handed in to C's set: C claims it
const a9 = att(9, { user_id: S2, created_at: '2026-09-09T09:00:00Z' }) // A's set, but before S2 joined

const sets = new Map<string, ReviewSet>([
  [SET_X, { id: SET_X, classroom_id: CA, title: 'Mock paper 1', is_mock: true }],
  [SET_Y, { id: SET_Y, classroom_id: CC, title: 'Chain rule drill', is_mock: false }],
])
const links = new Map([
  [a7.id, SET_X],
  [a9.id, SET_X],
  [a8.id, SET_Y],
])
const decisions = new Map([
  [a1.id, 'flag' as const],
  [a3.id, 'confirm' as const],
])
const names = new Map<string, string | null>([
  [S1, 'Amira Khan'],
  [S2, 'Ben <b>Ode</b>'],
])

function queue(filters: Partial<ReviewFilters> = {}, extra: Partial<Parameters<typeof assembleReviewQueue>[0]> = {}) {
  return assembleReviewQueue({
    classes: [classA, classC, classB],
    members,
    attempts: [a1, a2, a3, a4, a5, a6, a8, a9],
    linked: [a7],
    links,
    sets,
    decisions,
    names,
    filters: { ...EMPTY_REVIEW_FILTERS, ...filters },
    ...extra,
  })
}

{
  const { items, counts } = queue()
  const byId = new Map(items.map((i) => [i.attempt_id, i]))
  assert.deepEqual([...byId.keys()].sort(), [a1.id, a3.id, a4.id, a7.id, a8.id].sort(), 'only scripts the privacy rule allows')
  assert.equal(byId.get(a1.id)!.classroom_id, CA, 'the first class that accepts it claims it')
  assert.equal(byId.get(a3.id)!.classroom_id, CA)
  assert.equal(byId.get(a4.id)!.classroom_id, CB)
  assert.equal(byId.get(a7.id)!.classroom_id, CA, 'set work counts whatever its subject')
  assert.equal(byId.get(a7.id)!.assignment_id, SET_X)
  assert.equal(byId.get(a8.id)!.classroom_id, CC, "a set's class gets first claim on its hand-ins")
  assert.equal(byId.get(a8.id)!.assignment_id, SET_Y)
  assert.equal(byId.get(a1.id)!.assignment_id, null)

  assert.equal(byId.get(a1.id)!.display_name, 'Amira K.', 'names via displayName')
  assert.equal(byId.get(a3.id)!.display_name, 'Ben O.', 'markup in a name never reaches the queue')
  assert.equal(byId.get(a7.id)!.classroom_name, '12A Maths')
  assert.equal(byId.get(a7.id)!.work_label, 'Mock paper 1')
  assert.equal(byId.get(a1.id)!.work_label, '9709/12 Q3')
  assert.equal(byId.get(a4.id)!.work_label, 'ib-math-aa-hl/1')
  assert.equal(byId.get(a1.id)!.question_preview, 'Differentiate $x^3 + 2x$ with respect to $x$.')

  assert.equal(byId.get(a1.id)!.status, 'flagged')
  assert.equal(byId.get(a1.id)!.decision, 'flag')
  assert.ok(byId.get(a1.id)!.reasons.includes(REVIEW_REASON.flagged))
  assert.equal(byId.get(a3.id)!.status, 'confirmed')
  assert.equal(byId.get(a3.id)!.priority, 0, 'a confirmed script sinks')
  assert.deepEqual(byId.get(a7.id)!.reasons.slice(0, 2), [REVIEW_REASON.mock, REVIEW_REASON.setWork])
  assert.ok(byId.get(a8.id)!.reasons.includes(REVIEW_REASON.setWork))
  assert.ok(!byId.get(a8.id)!.reasons.includes(REVIEW_REASON.mock))

  assert.deepEqual(counts, { pending: 3, confirmed: 1, overridden: 0, flagged: 1, total: 5 })
  assert.deepEqual(items, sortReviewItems(items), 'sorted by priority, then newest')
  const at = (id: string) => items.findIndex((i) => i.attempt_id === id)
  assert.ok(at(a1.id) < at(a3.id), 'the flagged script comes before the confirmed one')
  assert.ok(items.slice(at(a3.id)).every((i) => i.priority === 0), 'nothing outranks a confirmed script from below')
}

{
  // The status filter narrows the items, never the counts (the picker shows them).
  const { items, counts } = queue({ status: 'flagged' })
  assert.deepEqual(items.map((i) => i.attempt_id), [a1.id])
  assert.equal(counts.total, 5)
  assert.deepEqual(queue({ status: 'overridden' }).items, [])
}

assert.deepEqual(queue({ student_id: S2 }).items.map((i) => i.attempt_id).sort(), [a3.id, a7.id].sort())
assert.deepEqual(queue({ student_id: S3 }).items, [], 'not a current student: nothing, not an error')
assert.deepEqual(queue({ assignment_id: SET_X }).items.map((i) => i.attempt_id), [a7.id], 'before-join hand-ins stay hidden')
assert.deepEqual(queue({ assignment_id: SET_Y }).counts.total, 1)

// Scoped to one class (the loader passes only that class): its own rule, nothing else.
{
  const onlyC = queue({ classroom_id: CC }, { classes: [classC] })
  assert.deepEqual(onlyC.items.map((i) => i.attempt_id).sort(), [a1.id, a8.id].sort())
  assert.ok(onlyC.items.every((i) => i.classroom_id === CC))
}

// A student who is no longer active in the class drops out, even with work in the list.
{
  const left = new Map(members)
  left.set(CA, [member(S1, '2026-09-01T00:00:00Z'), { student_id: S2, status: 'left', joined_at: '2026-09-10T00:00:00Z' }])
  const { items } = queue({}, { members: left })
  assert.ok(!items.some((i) => i.student_id === S2), 'left students are gone')
}

// "Unusual for this student": measured against their own other scripts, and the same in every view.
{
  const history = [1, 2, 3].map((n) => att(20 + n, { user_id: S1, created_at: `2026-09-2${n}T09:00:00Z`, marks_earned: 8, total_marks: 8 }))
  const odd = att(30, { user_id: S1, created_at: '2026-09-25T09:00:00Z', marks_earned: 1, total_marks: 8 })
  const run = (filters: Partial<ReviewFilters>) =>
    assembleReviewQueue({
      classes: [classA],
      members,
      attempts: [...history, odd],
      links: new Map(),
      sets: new Map(),
      decisions: new Map(),
      names,
      filters: { ...EMPTY_REVIEW_FILTERS, ...filters },
    }).items.find((i) => i.attempt_id === odd.id)!
  const all = run({})
  assert.ok(all.reasons.includes(REVIEW_REASON.unusual))
  assert.ok(all.reasons.includes(REVIEW_REASON.lowScore))
  const narrowed = run({ student_id: S1, status: 'pending' })
  assert.equal(narrowed.priority, all.priority, 'filters do not change a script’s priority')
  assert.deepEqual(narrowed.reasons, all.reasons)
}

console.log('reviews-query.test.ts — all assertions passed')
