import assert from 'node:assert/strict'
import {
  LIST_PAGE_SIZE,
  MAX_LIST_PAGE_SIZE,
  clampListLimit,
  decodeListCursor,
  encodeListCursor,
  pageSets,
  parseListStatus,
  type ListRow,
} from '@/lib/teacher/assignments/list'

const NOW = new Date('2026-09-25T12:00:00.000Z')
let n = 0
function row(over: Partial<ListRow>): ListRow {
  n += 1
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    published_at: '2026-09-20T08:00:00.000Z',
    closed_at: null,
    archived_at: null,
    due_at: null,
    created_at: `2026-09-${String(10 + n).padStart(2, '0')}T08:00:00.000Z`,
    updated_at: `2026-09-${String(10 + n).padStart(2, '0')}T09:00:00.000Z`,
    ...over,
  }
}

const dueSoon = row({ due_at: '2026-09-26T16:00:00.000Z' })
const dueLater = row({ due_at: '2026-10-03T16:00:00.000Z' })
const noDue = row({})
const pastDueInGrace = row({ due_at: '2026-09-24T16:00:00.000Z' })
const closedByTeacher = row({ closed_at: '2026-09-23T10:00:00.000Z', due_at: '2026-09-30T16:00:00.000Z' })
const autoClosed = row({ due_at: '2026-09-10T16:00:00.000Z' })
const draftOld = row({ published_at: null, updated_at: '2026-09-01T00:00:00.000Z' })
const draftNew = row({ published_at: null, updated_at: '2026-09-24T00:00:00.000Z' })
const deleted = row({ archived_at: '2026-09-22T00:00:00.000Z', due_at: '2026-09-26T16:00:00.000Z' })
const all = [dueLater, noDue, closedByTeacher, draftOld, deleted, autoClosed, dueSoon, draftNew, pastDueInGrace]

const ids = (rows: ListRow[]) => rows.map((r) => r.id)

// --- tabs -------------------------------------------------------------------------

assert.deepEqual(
  ids(pageSets(all, { status: 'open', limit: 50, now: NOW }).page),
  ids([pastDueInGrace, dueSoon, dueLater, noDue]),
  'open: soonest due first (past due inside the grace week is still open — that is where late lives), no due date last'
)
assert.deepEqual(
  ids(pageSets(all, { status: 'closed', limit: 50, now: NOW }).page),
  ids([closedByTeacher, autoClosed]),
  'closed: most recently closed first, auto-close included'
)
assert.deepEqual(ids(pageSets(all, { status: 'draft', limit: 50, now: NOW }).page), ids([draftNew, draftOld]), 'drafts: last edited first')
assert.ok(
  !pageSets(all, { limit: 50, now: NOW }).page.some((r) => r.id === deleted.id),
  'a deleted set is on no tab'
)
assert.equal(pageSets(all, { limit: 50, now: NOW }).page.length, all.length - 1, 'no status: everything not deleted')

// --- keyset paging ------------------------------------------------------------------

{
  const first = pageSets(all, { status: 'open', limit: 2, now: NOW })
  assert.deepEqual(ids(first.page), ids([pastDueInGrace, dueSoon]))
  assert.ok(first.next_cursor, 'more to come')
  const cursor = decodeListCursor(first.next_cursor, 'open')
  assert.ok(cursor)
  const second = pageSets(all, { status: 'open', limit: 2, now: NOW, cursor })
  assert.deepEqual(ids(second.page), ids([dueLater, noDue]))
  assert.equal(second.next_cursor, null, 'the last page says so')

  // A set published between the two page loads, due before the cursor, does
  // not shift the second page (keyset, not offset).
  const inserted = row({ due_at: '2026-09-25T16:00:00.000Z' })
  const again = pageSets([...all, inserted], { status: 'open', limit: 2, now: NOW, cursor })
  assert.deepEqual(ids(again.page), ids([dueLater, noDue]), 'no repeats, nothing skipped')
}

{
  const cursor = encodeListCursor({ scope: 'open', key: [1, 2], id: dueSoon.id })
  assert.equal(decodeListCursor(cursor, 'closed'), null, 'another tab’s cursor is refused')
  assert.equal(decodeListCursor('not-base64-json', 'open'), null)
  assert.equal(decodeListCursor(Buffer.from(JSON.stringify(['open', ['x'], dueSoon.id])).toString('base64url'), 'open'), null)
  assert.equal(decodeListCursor(Buffer.from(JSON.stringify(['open', [1], 'nope'])).toString('base64url'), 'open'), null)
  assert.equal(decodeListCursor('x'.repeat(400), 'open'), null)
  assert.deepEqual(decodeListCursor(cursor, 'open'), { scope: 'open', key: [1, 2], id: dueSoon.id })
}

// --- params -----------------------------------------------------------------------------

assert.equal(parseListStatus(null), undefined)
assert.equal(parseListStatus(''), undefined)
assert.equal(parseListStatus('open'), 'open')
assert.equal(parseListStatus('archived'), null, 'unknown tabs are an error, not "everything"')
assert.equal(clampListLimit(null), LIST_PAGE_SIZE)
assert.equal(clampListLimit('5'), 5)
assert.equal(clampListLimit('0'), LIST_PAGE_SIZE)
assert.equal(clampListLimit('9999'), MAX_LIST_PAGE_SIZE)

console.log('list.test.ts: all checks passed')
