import assert from 'node:assert/strict'
import { buildLorMarkingPrompt, buildPointBasedMarkingPrompt, FIXED_COUNT_BLOCK } from './prompts'

const scheme = JSON.stringify({
  type: 'point_based',
  marks: [
    { id: 1, type: 'B1', value: 1, description: 'Way 1: making a point/giving a way' },
    { id: 2, type: 'B1', value: 1, description: 'Way 2: making a point/giving a way' },
  ],
})

const cambridge = buildPointBasedMarkingPrompt(
  'Sociology',
  'Explain two ways that research might be influenced by how it is funded.',
  8,
  scheme,
  'Government funding may affect… Longitudinal research is expensive…',
  undefined,
  { board: 'cambridge', subjectCode: '9699' }
)
assert.ok(cambridge.includes(FIXED_COUNT_BLOCK), 'point-based marking carries the fixed-count rule')
assert.ok(
  /best N DISTINCT items/.test(cambridge) && /development of the first, never a new item/.test(cambridge),
  'the rule says what distinct means and what a repeat is'
)
assert.ok(
  cambridge.indexOf('OFFICIAL MARK SCHEME:') < cambridge.indexOf('FIXED-COUNT QUESTIONS:'),
  'the rule follows the scheme so it reads as a marking instruction, not a schema note'
)

for (const board of ['edexcel', 'aqa', 'oxfordaqa', 'ap'] as const) {
  const prompt = buildPointBasedMarkingPrompt('Physics', 'State two…', 2, scheme, 'x', undefined, { board })
  assert.ok(prompt.includes(FIXED_COUNT_BLOCK), `${board} point-based marking carries the rule too`)
}

const lor = buildLorMarkingPrompt('Sociology', 'Evaluate the view…', 26, '{"bands":[]}', 'essay')
assert.ok(!lor.includes('FIXED-COUNT QUESTIONS:'), 'banded essays are not point-counted, so the rule stays out')

console.log('point-prompt-fixed-count: all assertions passed')
