import assert from 'node:assert/strict'
import { parseMarkReturnPath } from '@/lib/marking/mark-return-url'
import { MARK_DEEP_LINK, deepLinkQuestion, isPracticeDeepLink } from '@/lib/marking/mark-deep-link'
import {
  ASSIGNMENT_ITEM_FIELD,
  assignmentReturnPath,
  markAssignmentLink,
  markAssignmentNotice,
  parseAssignmentDeepLink,
  parseAssignmentItemId,
  planSingleQuestionLink,
  planWholePaperLink,
  readMarkAssignmentLink,
  uncheckedAssignmentLink,
  ASSIGNMENT_UNCHECKED_REASON,
  sameSubjectFamily,
  studentMarkHref,
  type SingleQuestionMarkRequest,
} from '@/lib/teacher/assignments/link'
import type { AssignmentItem } from '@/lib/teacher/types'

const SET = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'
const ITEM = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

function item(over: Partial<AssignmentItem> = {}): AssignmentItem {
  return {
    id: ITEM,
    assignment_id: SET,
    position: 0,
    item_type: 'past_paper_question',
    mark_scheme_id: '11111111-1111-4111-8111-111111111111',
    paper_code: '9709/12',
    paper_session: 'May/June 2024',
    question_number: '3(a)',
    total_marks: 5,
    syllabus_tags: null,
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
    ...over,
  }
}

const url = (href: string) => new URL(href, 'https://markscheme.app')

// --- item ids --------------------------------------------------------------------

assert.equal(parseAssignmentItemId(ITEM.toUpperCase()), ITEM, 'ids are lower-cased')
assert.equal(parseAssignmentItemId(` ${ITEM} `), ITEM, 'and trimmed')
for (const bad of ['', 'abc', `${ITEM}x`, "'; drop table attempts", null, 42]) {
  assert.equal(parseAssignmentItemId(bad), null, `refused: ${String(bad)}`)
}
assert.equal(ASSIGNMENT_ITEM_FIELD, 'assignment_item_id', 'the field the marking routes read')

// --- studentMarkHref: past-paper question ------------------------------------------

{
  const href = studentMarkHref(item(), SET, { setTitle: 'Week 3 algebra' })
  const u = url(href)
  assert.equal(u.pathname, '/mark')
  assert.ok(isPracticeDeepLink(u.searchParams), 'the banked-question practice link')
  assert.equal(u.searchParams.get(MARK_DEEP_LINK.paper), '9709/12')
  assert.equal(u.searchParams.get(MARK_DEEP_LINK.session), 'May/June 2024')
  assert.equal(deepLinkQuestion(u.searchParams), '3(a)')
  assert.equal(u.searchParams.get('assignment'), ITEM, 'carries the item id')
  assert.equal(u.searchParams.get('pattern'), 'Week 3 algebra', 'the banner names the set')
  assert.equal(u.searchParams.get('return'), assignmentReturnPath(SET))
  assert.equal(
    parseMarkReturnPath(u.searchParams.get('return')),
    `/dashboard/assignments/${SET}`,
    '/mark accepts the way back to the set'
  )
  const link = parseAssignmentDeepLink(u.searchParams)
  assert.equal(link?.itemId, ITEM)
  assert.equal(link?.mode, 'question', 'nothing extra to set up: the practice link does it')
}

assert.ok(
  url(studentMarkHref(item({ paper_session: 's24' }), SET)).searchParams.get('session') === 'May/June 2024',
  'short session codes are expanded for the pickers'
)

// --- whole paper ----------------------------------------------------------------------

{
  const wp = item({ item_type: 'whole_paper', mark_scheme_id: null, question_number: null, total_marks: 75 })
  const u = url(studentMarkHref(wp, SET))
  assert.equal(u.searchParams.get('subject'), '9709', 'a subject link, which also keeps /mark’s remembered paper away')
  assert.equal(u.searchParams.get('session'), 'May/June 2024')
  assert.equal(u.searchParams.get('practice'), null, 'not the single-question practice link')
  const link = parseAssignmentDeepLink(u.searchParams)
  assert.equal(link?.mode, 'whole_paper')
  assert.equal(link?.paper, '9709/12')
  assert.equal(link?.session, 'May/June 2024')
}

// --- prompt ----------------------------------------------------------------------------

{
  const prompt = item({
    item_type: 'prompt',
    mark_scheme_id: null,
    paper_code: null,
    paper_session: null,
    question_number: null,
    prompt_text: 'Explain why x < 3 when 2x + 1 < 7. [4]',
    total_marks: 4,
  })
  const u = url(studentMarkHref(prompt, SET, { subjectCode: '9709' }))
  assert.equal(u.searchParams.get('subject'), '9709')
  assert.equal(u.searchParams.get('task'), 'Explain why x < 3 when 2x + 1 < 7. [4]', 'the prompt survives the URL intact')
  assert.equal(u.searchParams.get('marks'), '4')
  const link = parseAssignmentDeepLink(u.searchParams)
  assert.equal(link?.mode, 'prompt')
  assert.equal(link?.task, 'Explain why x < 3 when 2x + 1 < 7. [4]')
  assert.equal(link?.marks, 4)
}

assert.equal(parseAssignmentDeepLink(new URLSearchParams('practice=1&paper=9709/12&q=3')), null, 'no item, no link')
assert.equal(parseAssignmentDeepLink(new URLSearchParams('assignment=nope')), null, 'a malformed id is ignored')
assert.equal(
  parseAssignmentDeepLink(new URLSearchParams(`assignment=${ITEM}&marks=9999`))?.marks,
  null,
  'an absurd carried total is dropped'
)

// --- planSingleQuestionLink --------------------------------------------------------

const set = { title: 'Week 3 algebra', subject_code: '9709' }
const req = (over: Partial<SingleQuestionMarkRequest> = {}): SingleQuestionMarkRequest => ({
  markIntent: 'past_paper',
  manualPaperCode: '9709/12',
  manualPaperSession: 'May/June 2024',
  manualQuestionNumber: '3(a)',
  practiceSubjectCode: null,
  ibComponentKey: null,
  questionMarks: null,
  ...over,
})

assert.deepEqual(planSingleQuestionLink(item(), set, req()), { linked: true, overrides: {} }, 'the set’s question links')
assert.equal(
  planSingleQuestionLink(item(), set, req({ manualPaperSession: 's24', manualQuestionNumber: ' 3 (A) ' })).linked,
  true,
  'session codes and question spacing/case are normalised'
)
assert.equal(
  planSingleQuestionLink(item(), set, req({ manualQuestionNumber: 'Q3(a)' })).linked,
  true,
  'a Q prefix is tolerated'
)
{
  const other = planSingleQuestionLink(item(), set, req({ manualQuestionNumber: '4' }))
  assert.equal(other.linked, false, 'a different question from the same tab is NOT a hand-in')
  assert.ok(!other.linked && other.reason.includes('9709/12 May/June 2024 Q3(a)'), 'and the reason names what the set asks for')
}
assert.equal(
  planSingleQuestionLink(item(), set, req({ manualPaperCode: null, manualPaperSession: null, manualQuestionNumber: null })).linked,
  false,
  'an upload with no paper picked is not linked (reconciliation can still match it)'
)
assert.equal(
  planSingleQuestionLink(item(), set, req({ markIntent: 'practice_question' })).linked,
  false,
  'a practice mark is not a past-paper hand-in'
)
assert.equal(
  planSingleQuestionLink(item({ item_type: 'whole_paper', question_number: null, mark_scheme_id: null }), set, req()).linked,
  false,
  'a whole paper is handed in from whole-paper marking, not here'
)

{
  const prompt = item({
    item_type: 'prompt',
    mark_scheme_id: null,
    paper_code: null,
    paper_session: null,
    question_number: null,
    prompt_text: 'Discuss the causes of inflation. [10]',
    total_marks: 10,
    ib_component_key: 'paper_1',
  })
  const plan = planSingleQuestionLink(prompt, set, req({ practiceSubjectCode: '9708', ibComponentKey: 'paper_2' }))
  assert.ok(plan.linked)
  if (plan.linked) {
    assert.equal(plan.overrides.markIntent, 'practice_question', 'a prompt is always marked as a practice question')
    assert.equal(plan.overrides.questionText, 'Discuss the causes of inflation. [10]', 'the teacher’s prompt, not the form’s')
    assert.equal(plan.overrides.practiceSubjectCode, '9709', 'the class’s subject beats a stray remembered one')
    assert.equal(plan.overrides.ibComponentKey, 'paper_1', 'and the stray subject’s component goes with it')
    assert.equal(plan.overrides.questionMarks, 10, 'the item’s total when the student gave none')
  }
  const ib = planSingleQuestionLink(
    prompt,
    { title: 'IA prep', subject_code: 'ib-biology-hl' },
    req({ markIntent: 'practice_question', practiceSubjectCode: 'ib-biology', ibComponentKey: 'paper_2', questionMarks: 8 })
  )
  assert.ok(ib.linked)
  if (ib.linked) {
    assert.equal(ib.overrides.practiceSubjectCode, 'ib-biology', '/mark’s own code for the same course is kept')
    assert.equal(ib.overrides.ibComponentKey, 'paper_2', 'with the component the student picked')
    assert.equal(ib.overrides.questionMarks, 8, 'and their total')
  }
}

assert.equal(sameSubjectFamily('ib-biology', 'ib-biology-hl'), true)
assert.equal(sameSubjectFamily('IB-Biology-HL', 'ib-biology-hl'), true)
assert.equal(sameSubjectFamily('ib-bio', 'ib-biology-hl'), false, 'a prefix must end at a hyphen')
assert.equal(sameSubjectFamily('9709', '9708'), false)
assert.equal(sameSubjectFamily(null, '9709'), false)

// --- planWholePaperLink ------------------------------------------------------------------

{
  const wp = item({ item_type: 'whole_paper', mark_scheme_id: null, question_number: null })
  assert.equal(planWholePaperLink(wp, set, { paperCode: '9709/12', paperSession: 'May/June 2024' }).linked, true)
  assert.equal(planWholePaperLink(wp, set, { paperCode: '9709/12', paperSession: 's24' }).linked, true, 'session codes normalise')
  assert.equal(planWholePaperLink(wp, set, { paperCode: '9709/13', paperSession: 'May/June 2024' }).linked, false, 'another paper')
  assert.equal(planWholePaperLink(item(), set, { paperCode: '9709/12', paperSession: 'May/June 2024' }).linked, false, 'a question item')
}

// --- the result block ------------------------------------------------------------------------

{
  const linked = markAssignmentLink({ id: SET, title: 'Week 3 algebra' }, ITEM, { linked: true, overrides: {} })
  assert.deepEqual(readMarkAssignmentLink(JSON.parse(JSON.stringify(linked))), linked, 'round-trips through JSON')
  assert.equal(markAssignmentNotice(linked).text, 'Linked to Week 3 algebra — your teacher can see this mark.')
  assert.equal(markAssignmentNotice(linked).tone, 'linked')
  const unlinked = markAssignmentLink({ id: SET, title: 'Week 3 algebra' }, ITEM, { linked: false, reason: 'Not this one.' })
  assert.equal(markAssignmentNotice(unlinked).tone, 'unlinked')
  assert.equal(markAssignmentNotice(unlinked).text, 'Not this one.')
  assert.deepEqual(readMarkAssignmentLink(JSON.parse(JSON.stringify(unlinked))), unlinked, 'an unlinked result round-trips')

  // The set could not be checked (a database error): the mark went ahead, unlinked, and says so.
  const unchecked = uncheckedAssignmentLink(ITEM)
  assert.equal(unchecked.linked, false)
  assert.equal(unchecked.assignment_id, null, 'no set is named — the server does not know it')
  assert.deepEqual(readMarkAssignmentLink(JSON.parse(JSON.stringify(unchecked))), unchecked, 'round-trips with nulls')
  assert.equal(markAssignmentNotice(unchecked).text, ASSIGNMENT_UNCHECKED_REASON)
  assert.equal(
    readMarkAssignmentLink({ linked: true, assignment_id: null, item_id: ITEM, title: null }),
    null,
    'a link is never claimed without the set'
  )
  assert.equal(
    readMarkAssignmentLink({ linked: false, assignment_id: null, item_id: ITEM, title: null }),
    null,
    'an unnamed, unexplained miss says nothing'
  )
}
for (const junk of [null, 'linked', [], { linked: 'yes' }, { linked: true, assignment_id: 'x', item_id: ITEM, title: 't' }, { linked: true, assignment_id: SET, item_id: ITEM, title: '  ' }]) {
  assert.equal(readMarkAssignmentLink(junk), null, `junk is not a link: ${JSON.stringify(junk)}`)
}

console.log('link.test.ts: all checks passed')
