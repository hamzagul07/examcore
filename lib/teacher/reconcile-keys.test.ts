import assert from 'node:assert/strict'
import {
  legacyAttemptKey,
  legacyItemKey,
  wholePaperAttemptKey,
  wholePaperItemKey,
} from '@/lib/teacher/reconcile-keys'
import { blockEvidenceKey, type HydratedBlock } from '@/lib/plan/plan-view'

const scheme = { paper_code: '9709/12', paper_session: 'm24', question_number: '3' }

// --- question key --------------------------------------------------------------------

assert.equal(legacyAttemptKey({ mark_schemes: scheme }), 'q:9709/12|m24|3', 'object embed')
assert.equal(legacyAttemptKey({ mark_schemes: [scheme] }), 'q:9709/12|m24|3', 'array embed (generated types)')
assert.equal(legacyAttemptKey({ mark_schemes: null }), null, 'no scheme')
assert.equal(legacyAttemptKey({}), null, 'embed not selected')
assert.equal(legacyAttemptKey({ mark_schemes: [] }), null, 'empty array embed')
assert.equal(
  legacyAttemptKey({ mark_schemes: { ...scheme, question_number: null } }),
  null,
  'a key with a missing part would match the wrong question'
)
assert.equal(legacyAttemptKey({ mark_schemes: { ...scheme, paper_session: '  ' } }), null, 'blank parts are missing parts')
assert.equal(
  legacyAttemptKey({ mark_schemes: { paper_code: ' 9709/12 ', paper_session: 'm24 ', question_number: ' 3' } }),
  'q:9709/12|m24|3',
  'stray whitespace does not break a match'
)
assert.notEqual(
  legacyAttemptKey({ mark_schemes: { ...scheme, question_number: '3(a)' } }),
  legacyAttemptKey({ mark_schemes: scheme }),
  'sub-parts are different questions'
)

// Byte-identical to the roadmap's evidence key, so the two features agree on
// what "marked this question" means.
{
  const block = {
    question: { paperCode: '9709/12', paperSession: 'm24', questionNumber: '3' },
  } as unknown as HydratedBlock
  assert.equal(legacyAttemptKey({ mark_schemes: scheme }), blockEvidenceKey(block), 'same key as lib/plan')
}

// Both sides of the comparison come from here.
{
  const item = {
    item_type: 'past_paper_question' as const,
    paper_code: '9709/12',
    paper_session: 'm24',
    question_number: '3',
  }
  assert.equal(legacyItemKey(item), legacyAttemptKey({ mark_schemes: scheme }), 'item and attempt keys meet')
  assert.equal(legacyItemKey({ ...item, item_type: 'whole_paper' }), null, 'only question items have a question key')
  assert.equal(legacyItemKey({ ...item, item_type: 'prompt' }), null)
  assert.equal(legacyItemKey({ ...item, question_number: null }), null)
}

// --- whole-paper key ---------------------------------------------------------------------

assert.equal(
  wholePaperAttemptKey({ ai_marking: { phase: 'done', paper_code: '9701/42', paper_session: 's23' } }),
  'p:9701/42|s23'
)
assert.equal(wholePaperAttemptKey({ ai_marking: null }), null)
assert.equal(wholePaperAttemptKey({ ai_marking: 'string' }), null, 'non-object marking is ignored')
assert.equal(wholePaperAttemptKey({ ai_marking: [{ paper_code: 'x', paper_session: 'y' }] }), null, 'arrays are not the job state')
assert.equal(wholePaperAttemptKey({ ai_marking: { paper_code: '9701/42' } }), null, 'session required')
assert.equal(wholePaperAttemptKey({ ai_marking: { paper_code: 9701, paper_session: 's23' } }), null, 'non-string parts rejected')
assert.equal(
  wholePaperItemKey({ item_type: 'whole_paper', paper_code: '9701/42', paper_session: 's23' }),
  'p:9701/42|s23',
  'item side of the whole-paper match'
)
assert.equal(
  wholePaperItemKey({ item_type: 'past_paper_question', paper_code: '9701/42', paper_session: 's23' }),
  null,
  'a single question is never a whole-paper match'
)
assert.notEqual(
  wholePaperAttemptKey({ ai_marking: { paper_code: '9709/12', paper_session: 'm24' } }),
  legacyAttemptKey({ mark_schemes: scheme }),
  'paper and question keys never collide'
)

console.log('reconcile-keys.test.ts — all assertions passed')
