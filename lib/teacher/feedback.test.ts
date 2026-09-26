import assert from 'node:assert/strict'
import {
  FEEDBACK_BODY_MAX,
  cleanFeedbackBody,
  describeFeedbackFailure,
  feedbackCharsLeft,
  parseFeedbackDelete,
  parseFeedbackPost,
  sortFeedbackNotes,
} from '@/lib/teacher/feedback'

const CLASS = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
const NOTE = '11111111-2222-4333-8444-555555555555'

// --- POST {body, classroom_id?} ------------------------------------------------------------------

assert.deepEqual(parseFeedbackPost({ body: '  Lovely working.  ' }), {
  ok: true,
  value: { body: 'Lovely working.', classroom_id: null },
})
assert.deepEqual(parseFeedbackPost({ body: 'Good', classroom_id: CLASS }), {
  ok: true,
  value: { body: 'Good', classroom_id: CLASS.toLowerCase() },
})
assert.deepEqual(parseFeedbackPost({ body: 'Good', classroom_id: null }), { ok: true, value: { body: 'Good', classroom_id: null } })

for (const [input, field] of [
  [null, 'body'],
  ['Good', 'body'],
  [[], 'body'],
  [{}, 'body'],
  [{ body: 42 }, 'body'],
  [{ body: '   ' }, 'body'],
  [{ body: '<b></b><i> </i>' }, 'body'],
  [{ body: 'x'.repeat(FEEDBACK_BODY_MAX + 1) }, 'body'],
  [{ body: 'Good', classroom_id: 'class-1' }, 'classroom_id'],
  [{ body: 'Good', classroom_id: 7 }, 'classroom_id'],
] as const) {
  const r = parseFeedbackPost(input)
  assert.equal(r.ok, false, `must refuse ${JSON.stringify(input)}`)
  if (!r.ok) {
    assert.equal(r.field, field)
    assert.ok(r.error.length > 0)
  }
}

// Plain text only: tags, handlers and script URLs go; the words and line breaks stay.
{
  const r = parseFeedbackPost({
    body: '<p>Great <b>method</b>.</p>\n\n\n\n<script>fetch("//evil")</script>See <a href="javascript:alert(1)">this</a>\u202Eevil',
  })
  assert.equal(r.ok, true)
  if (!r.ok) throw new Error('unreachable')
  assert.equal(r.value.body, 'Great method.\n\nfetch("//evil") See thisevil')
  assert.doesNotMatch(r.value.body, /<|javascript:|\u202E/)
}
// Maths is not mistaken for markup.
assert.equal(cleanFeedbackBody('Check x<y and y>z'), 'Check x<y and y>z')
// The cap is on the stored (cleaned) text, so markup does not count against it.
assert.equal(parseFeedbackPost({ body: `${'a'.repeat(FEEDBACK_BODY_MAX)}<b></b>` }).ok, true)
assert.equal(feedbackCharsLeft('abc'), FEEDBACK_BODY_MAX - 3)
assert.equal(feedbackCharsLeft('<b>abc</b>'), FEEDBACK_BODY_MAX - 3)

// --- DELETE {id} -----------------------------------------------------------------------------------

assert.deepEqual(parseFeedbackDelete({ id: NOTE.toUpperCase() }), { ok: true, value: { id: NOTE } })
for (const bad of [undefined, null, {}, { id: 'abc' }, { id: 1 }, NOTE]) {
  const r = parseFeedbackDelete(bad)
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.field, 'id')
}

// --- display helpers ----------------------------------------------------------------------------------

assert.deepEqual(
  sortFeedbackNotes([
    { id: 'a', created_at: '2026-09-01T10:00:00Z' },
    { id: 'c', created_at: '2026-09-03T10:00:00Z' },
    { id: 'b', created_at: '2026-09-03T10:00:00Z' },
  ]).map((n) => n.id),
  ['c', 'b', 'a'],
  'newest first, ties by id'
)

assert.equal(describeFeedbackFailure(400, { error: 'Write a note first.' }), 'Not sent — write a note first.')
assert.match(describeFeedbackFailure(401, null), /session has expired/)
assert.match(describeFeedbackFailure(404, { error: 'Attempt not found' }), /no longer on your desk/)
assert.equal(describeFeedbackFailure(404, { error: 'Note not found' }, 'delete'), 'Not deleted — that note was already removed.')
assert.match(describeFeedbackFailure(500, {}, 'delete'), /^Not deleted — something went wrong/)

console.log('feedback.test.ts — all assertions passed')
