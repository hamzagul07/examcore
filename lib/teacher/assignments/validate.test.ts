import assert from 'node:assert/strict'
import { stripRawHtml } from '@/lib/community/sanitize'
import {
  MAX_ITEMS,
  expandedItemCount,
  isPaperCode,
  isSubjectCode,
  isTopicCode,
  isUuid,
  mergeAssignmentSettings,
  parseAssignmentDraft,
  parseAssignmentPatch,
  parseInstant,
  parseItemInput,
  parseRemindBody,
  parseSettings,
  parseStudentFlagsPatch,
  parseStudentIds,
  sanitizeSourceRef,
  teacherText,
} from '@/lib/teacher/assignments/validate'

const NOW = new Date('2026-09-25T12:00:00.000Z')
const S1 = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'
const S2 = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

// --- teacherText: no HTML, and no damage to maths or prose -----------------------

assert.equal(teacherText('Week 3 <b>algebra</b>'), 'Week 3 algebra', 'tags go, their text stays')
assert.equal(teacherText('<script>alert(1)</script>Read Q3'), 'alert(1) Read Q3', 'script tags go')
assert.equal(teacherText('<img src=x onerror=alert(1)>Q4'), 'Q4', 'a tag with a handler goes whole')
assert.equal(teacherText('<x-card onclick=steal()>hi'), '<x-card data-x=steal()>hi', 'an unknown tag keeps no live handler')
assert.equal(teacherText('see javascript:alert(1)'), 'see alert(1)', 'dangerous schemes go')
assert.equal(teacherText('javajavascript:script:alert(1)'), 'alert(1)', 'nested schemes cannot reassemble')
assert.equal(teacherText('data:text/html,<p>x</p>'), ', x', 'data:text/html goes')
assert.equal(teacherText('al<b>ge</b>bra'), 'algebra', 'inline tags leave no gap')
assert.equal(teacherText('one<br>two<p>three</p>'), 'one two three', 'block tags keep words apart')
assert.equal(teacherText('Show that x < 3 and y > 2'), 'Show that x < 3 and y > 2', 'comparisons survive')
assert.equal(teacherText('If x<y and y>z then x<z'), 'If x<y and y>z then x<z', 'tight comparisons survive')
assert.equal(teacherText('Question one = 5 marks'), 'Question one = 5 marks', 'prose with "one =" survives')
assert.equal(
  stripRawHtml(' one = 5'),
  ' data-x= 5',
  'why teacherText exists: the shared sanitiser rewrites " on…=" in plain prose'
)
assert.equal(teacherText('  Year   12\tMaths  '), 'Year 12 Maths', 'single-line collapses whitespace')
assert.equal(teacherText('Line one\r\n\r\n\r\n\r\nLine two', { multiline: true }), 'Line one\n\nLine two')
assert.equal(teacherText('Bio\u0000logy‮'), 'Biology', 'control and bidi-override characters go')
assert.equal(teacherText(42), null, 'non-strings are refused, not coerced')

// --- identifiers ---------------------------------------------------------------------

assert.ok(isUuid(S1) && !isUuid('nope'))
assert.ok(isSubjectCode('9709') && isSubjectCode('ib-biology-hl'))
assert.ok(!isSubjectCode('97%') && !isSubjectCode('9709_') && !isSubjectCode(''), 'no LIKE metacharacters')
assert.ok(isPaperCode('9709/12') && !isPaperCode('9709') && !isPaperCode('9709/12/3'))
assert.ok(isTopicCode('5.4.4') && isTopicCode('AHL3.10') && !isTopicCode('5 4') && !isTopicCode('.5'))

assert.equal(parseInstant('2026-10-02T16:00:00Z'), '2026-10-02T16:00:00.000Z')
assert.equal(parseInstant('2026-10-02T17:00:00+01:00'), '2026-10-02T16:00:00.000Z', 'offsets are honoured')
assert.equal(parseInstant('2026-10-02T16:00'), null, 'a local time without an offset is refused — whose 4pm?')
assert.equal(parseInstant('next friday'), null)

// --- items --------------------------------------------------------------------------------

assert.deepEqual(
  parseItemInput({ item_type: 'past_paper_question', paper_code: ' 9709/12 ', paper_session: 's24', question_number: ' 3(a) ' }, 0),
  { ok: true, value: { item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3(a)' } },
  'trimmed, session expanded'
)
assert.equal(parseItemInput({ item_type: 'past_paper_question', paper_code: '9709', paper_session: 's24', question_number: '3' }, 2).ok, false)
{
  const bad = parseItemInput({ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 's24', question_number: '' }, 4)
  assert.ok(!bad.ok && bad.field === 'items.4', 'the field names the row')
}
{
  const p = parseItemInput({ item_type: 'prompt', prompt_text: '<b>Explain</b> why x < 3', total_marks: 4, ib_component_key: 'paper_1' }, 0)
  assert.deepEqual(p, {
    ok: true,
    value: { item_type: 'prompt', prompt_text: 'Explain why x < 3', total_marks: 4, ib_component_key: 'paper_1' },
  })
}
assert.equal(parseItemInput({ item_type: 'prompt', prompt_text: '   ' }, 0).ok, false, 'an empty prompt')
assert.equal(parseItemInput({ item_type: 'prompt', prompt_text: 'x'.repeat(2001) }, 0).ok, false, 'an over-long prompt')
assert.equal(parseItemInput({ item_type: 'prompt', prompt_text: 'x', total_marks: 2.5 }, 0).ok, false, 'fractional marks')
assert.deepEqual(parseItemInput({ item_type: 'topic', topic_code: '5.4.4', per_topic: 3 }, 0), {
  ok: true,
  value: { item_type: 'topic', topic_code: '5.4.4', per_topic: 3 },
})
assert.equal(parseItemInput({ item_type: 'topic', topic_code: '5.4.4', per_topic: 9 }, 0).ok, false)
assert.equal(parseItemInput({ item_type: 'essay' }, 0).ok, false, 'unknown item types')
assert.equal(expandedItemCount([{ item_type: 'topic', topic_code: '1' }, { item_type: 'topic', topic_code: '2', per_topic: 4 }]), 6)

// --- the draft body ------------------------------------------------------------------------

const q = (n: number) => ({ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: String(n) })
const draft = (over: Record<string, unknown> = {}) => ({
  title: 'Week 3 algebra',
  kind: 'question_set',
  items: [q(1), q(2)],
  publish: true,
  due_at: '2026-10-02T16:00:00Z',
  ...over,
})

{
  const ok = parseAssignmentDraft(draft(), NOW)
  assert.ok(ok.ok)
  if (ok.ok) {
    assert.equal(ok.value.title, 'Week 3 algebra')
    assert.equal(ok.value.target, 'all', 'the whole class by default')
    assert.equal(ok.value.source, 'manual')
    assert.equal(ok.value.is_mock, false)
    assert.equal(ok.value.instructions, null)
    assert.equal(ok.value.due_at, '2026-10-02T16:00:00.000Z')
  }
}
const field = (r: ReturnType<typeof parseAssignmentDraft>) => (r.ok ? null : r.field)
assert.equal(field(parseAssignmentDraft(null, NOW)), 'body')
assert.equal(field(parseAssignmentDraft(draft({ title: '<b></b>' }), NOW)), 'title', 'a title of only markup is empty')
assert.equal(field(parseAssignmentDraft(draft({ title: 'x'.repeat(121) }), NOW)), 'title')
assert.equal(field(parseAssignmentDraft(draft({ kind: 'homework' }), NOW)), 'kind')
assert.equal(field(parseAssignmentDraft(draft({ due_at: '2026-09-20T16:00:00Z' }), NOW)), 'due_at', 'publishing into the past')
assert.equal(parseAssignmentDraft(draft({ due_at: '2026-09-20T16:00:00Z', publish: false }), NOW).ok, true, 'a draft may hold any date')
assert.equal(field(parseAssignmentDraft(draft({ due_at: '2029-01-01T00:00:00Z' }), NOW)), 'due_at', 'years out is a typo')
assert.equal(field(parseAssignmentDraft(draft({ items: [] }), NOW)), 'items', 'nothing to publish')
assert.equal(parseAssignmentDraft(draft({ items: [], publish: false }), NOW).ok, true, 'an empty draft is fine')
assert.equal(
  field(parseAssignmentDraft(draft({ items: Array.from({ length: MAX_ITEMS + 1 }, (_, i) => q(i + 1)) }), NOW)),
  'items',
  'more than twelve'
)
assert.equal(
  field(parseAssignmentDraft(draft({ items: [{ item_type: 'topic', topic_code: '1.1', per_topic: 4 }, { item_type: 'topic', topic_code: '1.2', per_topic: 4 }, { item_type: 'topic', topic_code: '1.3', per_topic: 4 }, q(1)] }), NOW)),
  'items',
  'twelve once topics are expanded'
)
{
  const wrongKind = parseAssignmentDraft(draft({ kind: 'whole_paper' }), NOW)
  assert.ok(!wrongKind.ok && wrongKind.field === 'items.0', 'a whole-paper set holds whole papers only')
  assert.equal(
    parseAssignmentDraft(draft({ kind: 'practice_prompt', items: [{ item_type: 'prompt', prompt_text: 'Why?' }] }), NOW).ok,
    true
  )
  assert.equal(
    parseAssignmentDraft(draft({ kind: 'topic_drill', items: [{ item_type: 'topic', topic_code: '1.2' }] }), NOW).ok,
    true
  )
}
{
  const targeted = parseAssignmentDraft(draft({ target: { student_ids: [S1, S1.toUpperCase(), S2] } }), NOW)
  assert.ok(targeted.ok && targeted.value.target !== 'all' && targeted.value.target.student_ids.length === 2, 'ids deduplicated')
  assert.equal(field(parseAssignmentDraft(draft({ target: { student_ids: [] } }), NOW)), 'target')
  assert.equal(field(parseAssignmentDraft(draft({ target: { student_ids: ['x'] } }), NOW)), 'target')
  assert.equal(field(parseAssignmentDraft(draft({ target: 'everyone' }), NOW)), 'target')
}
{
  const withRef = parseAssignmentDraft(
    draft({ source: 'reteach', source_ref: { codes: ['1.2', '<b>1.3</b>'], week: '2026-W39', nested: { a: 1 }, 'BAD KEY': 1 } }),
    NOW
  )
  assert.ok(withRef.ok && withRef.value.source === 'reteach')
  if (withRef.ok) assert.deepEqual(withRef.value.source_ref, { codes: ['1.2', '1.3'], week: '2026-W39' }, 'provenance kept flat and clean')
  assert.equal(field(parseAssignmentDraft(draft({ source: 'ai' }), NOW)), 'source')
}
assert.equal(sanitizeSourceRef('x'), null)
assert.equal(field(parseAssignmentDraft(draft({ settings: { timed_minutes: 0 } }), NOW)), 'settings.timed_minutes')
assert.equal(field(parseAssignmentDraft(draft({ is_mock: 'yes' }), NOW)), 'is_mock')
assert.equal(field(parseAssignmentDraft(draft({ publish: 'true' }), NOW)), 'publish', 'no truthy strings')

// --- settings -------------------------------------------------------------------------------

assert.deepEqual(parseSettings({ timed_minutes: 45, allow_late: false, colour: 'red' }), {
  ok: true,
  value: { timed_minutes: 45, allow_late: false },
})
assert.deepEqual(mergeAssignmentSettings({ timed_minutes: 45, allow_late: false }, { timed_minutes: null }), { allow_late: false }, 'null clears the timer')
assert.deepEqual(mergeAssignmentSettings({ allow_late: true }, { timed_minutes: 30 }), { allow_late: true, timed_minutes: 30 })
assert.deepEqual(mergeAssignmentSettings(null, {}), {})

// --- PATCH --------------------------------------------------------------------------------------

const draftSet = { kind: 'question_set' as const, published_at: null }
const liveSet = { kind: 'question_set' as const, published_at: '2026-09-21T08:00:00Z' }
{
  const items = parseAssignmentPatch({ items: [q(4)] }, draftSet)
  assert.ok(items.ok && items.value.items?.length === 1, 'a draft’s items can change')
  const locked = parseAssignmentPatch({ items: [q(4)] }, liveSet)
  assert.ok(!locked.ok && locked.status === 409 && locked.field === 'items', 'a published set’s items cannot (409)')
  const closeDraft = parseAssignmentPatch({ closed_at: '2026-09-25T12:00:00Z' }, draftSet)
  assert.ok(!closeDraft.ok && closeDraft.status === 409, 'a draft cannot be closed')
  assert.deepEqual(parseAssignmentPatch({ closed_at: null }, liveSet), { ok: true, value: { closed_at: null } }, 'reopen')
  assert.deepEqual(parseAssignmentPatch({ due_at: null, instructions: '  ' }, liveSet), {
    ok: true,
    value: { due_at: null, instructions: null },
  })
  const nothing = parseAssignmentPatch({}, liveSet)
  assert.ok(!nothing.ok && nothing.field === 'body')
  assert.equal(parseAssignmentPatch({ title: '' }, liveSet).ok, false)
}

// --- per-student flags ----------------------------------------------------------------------------

const due = { due_at: '2026-09-25T16:00:00.000Z' }
assert.deepEqual(parseStudentFlagsPatch({ excused: true }, due), { ok: true, value: { excused: true } })
assert.deepEqual(parseStudentFlagsPatch({ extended_due_at: '2026-09-27T16:00:00Z' }, due), {
  ok: true,
  value: { extended_due_at: '2026-09-27T16:00:00.000Z' },
})
{
  const earlier = parseStudentFlagsPatch({ extended_due_at: '2026-09-24T16:00:00Z' }, due)
  assert.ok(!earlier.ok && earlier.field === 'extended_due_at', 'an "extension" before the due date would do nothing')
  const noDue = parseStudentFlagsPatch({ extended_due_at: '2026-09-27T16:00:00Z' }, { due_at: null })
  assert.ok(!noDue.ok, 'nothing to extend without a due date')
}
assert.deepEqual(parseStudentFlagsPatch({ extended_due_at: null }, due), { ok: true, value: { extended_due_at: null } })
assert.deepEqual(parseStudentFlagsPatch({ feedback: '<p>Great <i>method</i></p>\n\n\n\nRedo Q2' }, due), {
  ok: true,
  value: { feedback: 'Great method\n\nRedo Q2' },
})
assert.deepEqual(parseStudentFlagsPatch({ feedback: '' }, due), { ok: true, value: { feedback: null } }, 'an empty note clears it')
assert.equal(parseStudentFlagsPatch({ feedback: 'x'.repeat(2001) }, due).ok, false)
assert.equal(parseStudentFlagsPatch({ excused: 'yes' }, due).ok, false)
assert.equal(parseStudentFlagsPatch({}, due).ok, false)

// --- remind ---------------------------------------------------------------------------------------

assert.deepEqual(parseRemindBody(undefined), { ok: true, value: { student_ids: null } }, 'no body: everyone missing')
assert.deepEqual(parseRemindBody({ student_ids: [] }), { ok: true, value: { student_ids: null } })
assert.deepEqual(parseRemindBody({ student_ids: [S1] }), { ok: true, value: { student_ids: [S1] } })
assert.equal(parseRemindBody({ student_ids: ['x'] }).ok, false)
assert.equal(parseStudentIds(Array.from({ length: 501 }, () => S1), 'target').ok, false, 'at most 500')

console.log('validate.test.ts: all checks passed')
