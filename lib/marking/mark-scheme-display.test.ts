import assert from 'node:assert/strict'
import {
  extractMarkSchemeRubric,
  rubricPointForMarkType,
} from './mark-scheme-display'

const pointRubric = extractMarkSchemeRubric({
  type: 'point_based',
  marks: [
    { id: 1, type: 'M1', value: 1, description: 'Correct method for $F=ma$' },
    { id: 2, type: 'A1', value: 1, description: 'Correct final answer' },
  ],
  common_errors: ['Sign error in acceleration'],
})

assert.ok(pointRubric)
assert.equal(pointRubric?.points.length, 2)
assert.equal(rubricPointForMarkType(pointRubric, 'm1')?.description, 'Correct method for $F=ma$')

console.log('mark-scheme-display.test.ts: ok')
