import assert from 'node:assert/strict'
import type { ErrorClassificationDetail } from '@/lib/error-classifications'
import { attemptErrors, buildErrorGroups, type GroupAttempt } from '@/lib/teacher/groups'

// --- fixtures ---------------------------------------------------------------------------
//
// A Chemistry (9701) class. `detail` is the normalised attempts.error_classifications
// column; `point` is a raw ai_marking.marks_awarded entry.

type Kind = ErrorClassificationDetail['classification']
const detail = (classification: Kind, mark_id: string): ErrorClassificationDetail => ({
  classification,
  mark_id,
  description: 'x',
})
const point = (mark_id: string, earned: boolean, error_classification: string | null = null) => ({
  mark_id,
  earned,
  error_classification,
})

function attempt(
  user: string,
  tags: string[] | null,
  details: ErrorClassificationDetail[] | null,
  points: ReturnType<typeof point>[] | null = null
): GroupAttempt {
  return {
    user_id: user,
    syllabus_tags: tags,
    error_classifications: details,
    ai_marking: points ? { marks_awarded: points } : null,
  }
}

// --- the evidence for one attempt -------------------------------------------------------

assert.deepEqual(
  attemptErrors(attempt('a', ['1.1'], [detail('conceptual', 'M1'), detail('no_error', 'A1'), detail('arithmetic', 'A2')])),
  ['conceptual', 'arithmetic'],
  'earned marks are not errors'
)
assert.deepEqual(
  attemptErrors(
    attempt('a', ['1.1'], [detail('conceptual', 'M1'), detail('arithmetic', 'A1')], [
      point('M1', true), // a teacher re-marked M1 as earned
      point('A1', false, 'arithmetic'),
    ])
  ),
  ['arithmetic'],
  'a mark overridden to earned is no longer an error'
)
assert.deepEqual(
  attemptErrors(
    attempt('a', ['1.1'], null, [
      point('M1', false, 'Conceptual'),
      point('A1', true, 'no_error'),
      point('A2', false, 'algebraic-sign'),
      point('B1', false, 'marker_error'),
      point('B2', false, null),
    ])
  ),
  ['conceptual', 'algebraic_sign'],
  'older rows fall back to the per-mark classification; marker bookkeeping and blanks are not student errors'
)
assert.deepEqual(attemptErrors(attempt('a', ['1.1'], [])), [], 'nothing recorded, nothing inferred')

// --- grouping -------------------------------------------------------------------------------

const work: GroupAttempt[] = [
  // Conceptual errors on 1.1 (Particles in the atom) — Amira, Ben, Cara.
  attempt('amira', ['1.1'], [detail('conceptual', 'M1'), detail('conceptual', 'M2')]),
  attempt('ben', ['1.1', '1.2'], [detail('conceptual', 'M1')]),
  attempt('cara', ['1.1'], [detail('conceptual', 'B1')]),
  // Conceptual on 2.1 — only Dev: not a group.
  attempt('dev', ['2.1'], [detail('conceptual', 'M1')]),
  // Arithmetic slips on different topics — a habit across topics.
  attempt('amira', ['2.1'], [detail('arithmetic', 'A1')]),
  attempt('dev', ['3.1'], [detail('arithmetic', 'A1'), detail('arithmetic', 'A2')]),
  // A conceptual error with no usable tag has no topic to reteach.
  attempt('eli', null, [detail('conceptual', 'M1')]),
  attempt('fay', ['not-a-9701-code'], [detail('conceptual', 'M1')]),
  // Clean work.
  attempt('gus', ['1.1'], [detail('no_error', 'M1')]),
]

const groups = buildErrorGroups(work, '9701')
assert.deepEqual(
  groups.map((g) => g.key),
  ['conceptual:1.1', 'arithmetic:*'],
  'two or more students each; the largest group first'
)

const [concept, slips] = groups
assert.equal(concept.label, 'Conceptual errors in Particles in the atom and atomic radius (1.1)')
assert.equal(concept.classification, 'conceptual')
assert.equal(concept.leaf_code, '1.1')
assert.deepEqual(concept.student_ids, ['amira', 'ben', 'cara'])
assert.equal(concept.evidence_count, 4, 'every lost mark counts as evidence')

assert.equal(slips.label, 'Arithmetic slips across topics')
assert.equal(slips.leaf_code, null, 'a slip is a habit, not a topic')
assert.deepEqual(slips.student_ids, ['amira', 'dev'])
assert.equal(slips.evidence_count, 3)

assert.ok(
  !groups.some((g) => g.student_ids.includes('eli') || g.student_ids.includes('fay')),
  'untagged conceptual errors are not lumped into a vague group'
)

// Ben's attempt is tagged 1.1 and 1.2; with a threshold of one he forms a 1.2 group alone.
const singles = buildErrorGroups(work, '9701', 1)
assert.ok(singles.some((g) => g.key === 'conceptual:1.2' && g.student_ids.join() === 'ben'))
assert.ok(singles.some((g) => g.key === 'conceptual:2.1' && g.student_ids.join() === 'dev'))
assert.deepEqual(buildErrorGroups(work, '9701', 0).length, singles.length, 'a threshold below one means one')
assert.deepEqual(buildErrorGroups(work, '9701', 4), [], 'nobody groups of four here')

// Deterministic order for equal groups: students, then evidence, then kind, then key.
const tie = buildErrorGroups(
  [
    attempt('a', ['1.1'], [detail('time_pressure', 'A1')]),
    attempt('b', ['1.1'], [detail('time_pressure', 'A1')]),
    attempt('a', ['1.1'], [detail('incomplete', 'A1')]),
    attempt('b', ['1.1'], [detail('incomplete', 'A1')]),
    attempt('a', ['1.1'], [detail('algebraic_sign', 'A1')]),
    attempt('b', ['1.1'], [detail('algebraic_sign', 'A1')]),
  ],
  '9701'
)
assert.deepEqual(
  tie.map((g) => g.key),
  ['algebraic_sign:*', 'incomplete:*', 'time_pressure:*']
)
assert.deepEqual(
  tie.map((g) => g.label),
  ['Sign and algebra slips across topics', 'Unfinished working across topics', 'Rushed under time pressure across topics']
)

// Another subject: leaves come from its own syllabus.
const ib = buildErrorGroups(
  [
    attempt('a', ['R1.4'], [detail('conceptual', 'M1')]),
    attempt('b', ['R1.4'], [detail('conceptual', 'M1')]),
  ],
  'ib-chemistry-hl'
)
assert.equal(ib[0].leaf_code, 'R1.4')
assert.equal(buildErrorGroups(work, '4024').filter((g) => g.leaf_code !== null).length, 0, 'no tree, no topic groups')
assert.deepEqual(buildErrorGroups([], '9701'), [], 'an empty class has no groups')

console.log('groups.test.ts: ok')
