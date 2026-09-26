import assert from 'node:assert/strict'
import type { ClassroomAttempt } from '@/lib/teacher-analytics'
import {
  HISTORY_MAX_SCAN,
  VIEW_AUDIT_WINDOW_MS,
  advanceHistoryScan,
  decodeHistoryCursor,
  encodeHistoryCursor,
  historyCursorFilter,
  historyScanContinues,
  latestDecisions,
  nextHistoryCursor,
  questionPreviewLine,
  startHistoryScan,
  toHistoryRow,
  viewAuditDue,
  workLabel,
} from '@/lib/teacher/insights/history'

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// --- cursor --------------------------------------------------------------------------------

{
  const cursor = { created_at: '2026-09-25T10:11:12.123456+00:00', id: ID(7) }
  const raw = encodeHistoryCursor(cursor)
  assert.match(raw, /^[A-Za-z0-9_-]+$/, 'url-safe, no padding')
  assert.deepEqual(decodeHistoryCursor(raw), cursor)
  assert.deepEqual(
    decodeHistoryCursor(encodeHistoryCursor({ created_at: '2026-01-02T03:04:05Z', id: ID(1).toUpperCase() })),
    { created_at: '2026-01-02T03:04:05Z', id: ID(1) },
    'ids come back lower-case'
  )
  assert.equal(
    historyCursorFilter(cursor),
    `created_at.lt."2026-09-25T10:11:12.123456+00:00",and(created_at.eq."2026-09-25T10:11:12.123456+00:00",id.lt.${ID(7)})`
  )
}

const b64 = (v: unknown) => btoa(JSON.stringify(v)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
for (const hostile of [
  null,
  undefined,
  '',
  'not base64 at all!',
  'a'.repeat(201),
  b64(['2026-01-01T00:00:00Z']), // one value
  b64({ created_at: '2026-01-01T00:00:00Z', id: ID(1) }), // not an array
  b64(['2026-01-01T00:00:00Z', 'not-a-uuid']),
  b64(['yesterday', ID(1)]),
  b64(['2026-01-01T00:00:00Z",id.gt.0),(x', ID(1)]), // filter injection
  b64(['2026-13-45T99:99:99Z', ID(1)]), // looks like a date, is not one
  b64([123, ID(1)]),
]) {
  assert.equal(decodeHistoryCursor(hostile as string), null, `refused: ${String(hostile)}`)
}

// --- assembling a page ----------------------------------------------------------------------

type Row = { id: string; created_at: string; keep: boolean }
const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
  id: ID(100 - i),
  created_at: `2026-09-${String(20 - i).padStart(2, '0')}T12:00:00Z`,
  keep: i % 2 === 0, // every other row is in scope
}))
const keep = (r: Row) => r.keep

{
  // A page fills part-way through a batch: rows after it remain, so there is a next page.
  let scan = startHistoryScan<Row>(null)
  scan = advanceHistoryScan(scan, rows.slice(0, 6), { requested: 6, pageSize: 2, keep })
  assert.deepEqual(
    scan.rows.map((r) => r.id),
    [ID(100), ID(98)]
  )
  assert.equal(scan.full, true)
  assert.equal(scan.exhausted, false)
  assert.equal(scan.scanned, 3, 'stops examining once the page is full')
  assert.deepEqual(scan.last, { created_at: rows[2].created_at, id: rows[2].id }, 'cursor = last row examined')
  assert.equal(historyScanContinues(scan), false)
  const next = nextHistoryCursor(scan)
  assert.ok(next)
  assert.deepEqual(decodeHistoryCursor(next), scan.last)
}
{
  // Out-of-scope rows are skipped but still move the cursor, across batches.
  let scan = startHistoryScan<Row>(null)
  scan = advanceHistoryScan(scan, rows.slice(0, 4), { requested: 4, pageSize: 4, keep })
  assert.equal(scan.rows.length, 2)
  assert.equal(historyScanContinues(scan), true, 'not full, not exhausted: read on')
  scan = advanceHistoryScan(scan, rows.slice(4, 8), { requested: 4, pageSize: 4, keep })
  assert.deepEqual(
    scan.rows.map((r) => r.id),
    [ID(100), ID(98), ID(96), ID(94)]
  )
  assert.equal(scan.full, true)
  assert.deepEqual(scan.last?.id, ID(94), 'the page ends on the row that filled it')
}
{
  // A short batch examined to the end: nothing after it.
  let scan = startHistoryScan<Row>(null)
  scan = advanceHistoryScan(scan, rows.slice(6), { requested: 6, pageSize: 30, keep })
  assert.equal(scan.exhausted, true)
  assert.equal(scan.full, false)
  assert.equal(nextHistoryCursor(scan), null)
  assert.equal(historyScanContinues(scan), false)
}
{
  // Page fills exactly on the last row of a short batch: exhausted, no phantom next page.
  let scan = startHistoryScan<Row>(null)
  scan = advanceHistoryScan(scan, [rows[0], rows[1], rows[2]], { requested: 5, pageSize: 2, keep })
  assert.equal(scan.full, true)
  assert.equal(scan.exhausted, true)
  assert.equal(nextHistoryCursor(scan), null)
}
{
  // An empty first batch: empty page, no cursor.
  const scan = advanceHistoryScan(startHistoryScan<Row>(null), [], { requested: 60, pageSize: 30, keep })
  assert.deepEqual(scan.rows, [])
  assert.equal(nextHistoryCursor(scan), null)
}
{
  // The scan budget: stop and hand back a cursor rather than read a whole other subject.
  let scan = startHistoryScan<Row>(null)
  const none = Array.from({ length: 60 }, (_, i) => ({ id: ID(i + 1), created_at: '2026-01-01T00:00:00Z', keep: false }))
  let rounds = 0
  while (historyScanContinues(scan)) {
    scan = advanceHistoryScan(scan, none, { requested: 60, pageSize: 30, keep })
    rounds += 1
  }
  assert.equal(scan.scanned, HISTORY_MAX_SCAN)
  assert.equal(rounds, HISTORY_MAX_SCAN / 60)
  assert.equal(scan.rows.length, 0)
  assert.ok(nextHistoryCursor(scan), 'a partial (even empty) page still offers "load more"')
}
{
  // Continuing from a cursor keeps it until a row is examined.
  const after = { created_at: '2026-09-01T00:00:00Z', id: ID(5) }
  const scan = startHistoryScan<Row>(after)
  assert.deepEqual(scan.last, after)
}

// --- rows -------------------------------------------------------------------------------------

function attempt(over: Partial<ClassroomAttempt> = {}): ClassroomAttempt {
  return {
    id: ID(1),
    user_id: ID(2),
    marks_earned: 7,
    total_marks: 9,
    syllabus_tags: ['3.4', '3.4', '3.5', '1.1', '2.2', '2.3'],
    created_at: '2026-09-20T10:00:00Z',
    question_text: 'Find   the\n area under y = x^2 between 0 and 1.',
    mark_scheme_id: ID(3),
    assignment_item_id: null,
    ai_marking: { paper_code: null, paper_session: null, judgement_marking: false },
    mark_schemes: { paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3' },
    ...over,
  }
}

{
  const row = toHistoryRow(attempt(), {
    decision: { decision: 'override', created_at: '2026-09-21T00:00:00Z' },
    set: { id: ID(9), classroom_id: ID(8), title: 'Integration drill' },
  })
  assert.equal(row.work, '9709/12 · May/June 2024 · Q3')
  assert.equal(row.preview, 'Find the area under y = x^2 between 0 and 1.')
  assert.equal(row.pct, 77.8)
  assert.equal(row.marks_earned, 7)
  assert.deepEqual(row.topics, ['3.4', '3.5', '1.1', '2.2'], 'de-duplicated, first four')
  assert.equal(row.decision, 'override')
  assert.equal(row.decided_at, '2026-09-21T00:00:00Z')
  assert.equal(row.set?.title, 'Integration drill')
}
{
  // A whole paper still being marked has no percentage — not 0%.
  const row = toHistoryRow(
    attempt({
      marks_earned: 0,
      total_marks: 0,
      mark_scheme_id: null,
      mark_schemes: null,
      ai_marking: { paper_code: '9709/32', paper_session: 'Oct/Nov 2023' },
    })
  )
  assert.equal(row.work, 'Whole paper · 9709/32 · Oct/Nov 2023')
  assert.equal(row.pct, null)
  assert.equal(row.marks_earned, null)
  assert.equal(row.total_marks, null)
  assert.equal(row.decision, null)
}
assert.equal(workLabel({ mark_schemes: null, ai_marking: null, mark_scheme_id: null }), 'Practice question')
assert.equal(
  toHistoryRow(attempt({ marks_earned: 12, total_marks: 9 })).pct,
  100,
  'an over-recorded mark is capped at the total'
)
assert.equal(toHistoryRow(attempt({ ai_marking: { judgement_marking: true } })).judgement, true)

assert.equal(questionPreviewLine(null), null)
assert.equal(questionPreviewLine('   '), null)
{
  const long = `${'word '.repeat(60)}end`
  const p = questionPreviewLine(long, 40)!
  assert.ok(p.length <= 40)
  assert.ok(p.endsWith('…'))
  assert.ok(!p.includes('  '))
}

{
  const latest = latestDecisions([
    { id: 'a', attempt_id: 'x', decision: 'confirm', created_at: '2026-09-01T00:00:00Z' },
    { id: 'b', attempt_id: 'x', decision: 'override', created_at: '2026-09-02T00:00:00Z' },
    { id: 'c', attempt_id: 'y', decision: 'flag', created_at: '2026-09-03T00:00:00Z' },
    { id: 'e', attempt_id: 'y', decision: 'confirm', created_at: '2026-09-03T00:00:00Z' },
    { id: 'z', attempt_id: 'y', decision: 'override', created_at: 'garbage' },
  ])
  assert.deepEqual(latest.get('x'), { decision: 'override', created_at: '2026-09-02T00:00:00Z' })
  assert.equal(latest.get('y')?.decision, 'confirm', 'ties go to the larger id, unreadable dates are skipped')
  assert.equal(latest.has('nope'), false)
}

// --- the audit window --------------------------------------------------------------------------

{
  const now = Date.parse('2026-09-25T12:00:00Z')
  assert.equal(viewAuditDue(null, now), true, 'never logged: log it')
  assert.equal(viewAuditDue('not a date', now), true)
  assert.equal(viewAuditDue(new Date(now - 5 * 60_000).toISOString(), now), false, 'same sitting: nothing new')
  assert.equal(viewAuditDue(new Date(now - VIEW_AUDIT_WINDOW_MS).toISOString(), now), true, 'an hour on: log again')
  assert.equal(viewAuditDue(new Date(now + 60_000).toISOString(), now), false, 'clock skew is still recent')
}

console.log('lib/teacher/insights/history.test.ts — all assertions passed')
