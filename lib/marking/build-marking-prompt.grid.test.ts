import assert from 'node:assert/strict'
import { buildMarkingPrompt, hasObjectiveGrid, objectiveGridMax } from './build-marking-prompt'
import { buildVerifyMarkingPrompt, cambridgeAoGuidance, CAMBRIDGE_AO_GUIDANCE, CAMBRIDGE_SHORT_QUESTION_RULINGS } from './prompts'
import type { MarkSchemeRow } from './types'

const base: MarkSchemeRow = {
  id: 'r1', board: 'Cambridge International', subject: 'Business', paper_code: '9609/42', paper_session: 'May/June 2023',
  question_number: '1', question_text: 'Evaluate the extent to which leadership contributed…', total_marks: 20, marking_type: 'level_of_response',
  mark_scheme: {
    type: 'level_of_response',
    criteria: [
      { id: 'AO1', name: 'Knowledge and understanding', max_marks: 3, bands: [{ level: 2, marks_min: 2, marks_max: 3, descriptor: 'Developed knowledge' }, { level: 1, marks_min: 1, marks_max: 1, descriptor: 'Limited knowledge' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'None' }] },
      { id: 'AO3', name: 'Analysis', max_marks: 17, bands: [{ level: 1, marks_min: 1, marks_max: 17, descriptor: 'Analysis' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'None' }] },
    ],
    bands: [{ level: 1, marks_min: 1, marks_max: 20, descriptor: 'overall' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'none' }],
  },
}

assert.equal(hasObjectiveGrid(base.mark_scheme), true)
assert.deepEqual(objectiveGridMax(base.mark_scheme), [{ letter: 'AO1', maxMarks: 3 }, { letter: 'AO3', maxMarks: 17 }])
assert.equal(objectiveGridMax({ type: 'level_of_response', bands: [] }), null, 'no grid, no maxima')

const gridPrompt = buildMarkingPrompt({ markScheme: base, markingStyle: 'level_of_response', ocrText: 'Leadership mattered because…', questionText: base.question_text, subjectName: 'Business', subjectCode: '9609', isOfficial: true })
assert.match(gridPrompt, /mark EACH OBJECTIVE SEPARATELY/i, 'a grid scheme routes to the per-objective essay prompt')
assert.match(gridPrompt, /"criteria_results"/, 'the per-objective prompt asks for criteria_results')
assert.match(gridPrompt, /convincingly meets the statement → the highest mark/, "carries Cambridge's within-level rule")

const flat: MarkSchemeRow = { ...base, mark_scheme: { type: 'level_of_response', bands: base.mark_scheme.bands } }
const flatPrompt = buildMarkingPrompt({ markScheme: flat, markingStyle: 'level_of_response', ocrText: 'x', questionText: base.question_text, subjectName: 'Business', subjectCode: '9609', isOfficial: true })
assert.doesNotMatch(flatPrompt, /EACH OBJECTIVE SEPARATELY/, 'a plain band scale keeps the single-band prompt')
assert.match(flatPrompt, /"band_result"/)


// The verify pass on a grid essay must re-mark by the same examiner guidance
// as the first pass; without it, it re-read evaluation 5 → 3 against an
// examiner's 7 and a second verify sided with it.
const verifyWith = buildVerifyMarkingPrompt({ subjectName: 'Business', board: 'Cambridge International', questionText: 'q', ocrText: 'a', schemeJson: '{}', priorResultJson: '{}', totalMarks: 20, examinerGuidance: cambridgeAoGuidance({ shortStructured: false }) })
assert.match(verifyWith, /FOR THE ASSESSMENT OBJECTIVES \(criteria_results\): re-mark EACH objective independently/)
assert.ok(verifyWith.includes(CAMBRIDGE_AO_GUIDANCE), 'the verify pass carries the examiner guidance')
assert.ok(!verifyWith.includes(CAMBRIDGE_SHORT_QUESTION_RULINGS), 'a 20-mark essay does not get the short-question rulings')
const verifyShort = buildVerifyMarkingPrompt({ subjectName: 'Business', board: 'Cambridge International', questionText: 'q', ocrText: 'a', schemeJson: '{}', priorResultJson: '{}', totalMarks: 8, examinerGuidance: cambridgeAoGuidance({ shortStructured: true }) })
assert.ok(verifyShort.includes(CAMBRIDGE_SHORT_QUESTION_RULINGS), 'a short question does')
const verifyPlain = buildVerifyMarkingPrompt({ subjectName: 'Physics', board: 'Cambridge International', questionText: 'q', ocrText: 'a', schemeJson: '{}', priorResultJson: '{}', totalMarks: 4 })
assert.doesNotMatch(verifyPlain, /FOR THE ASSESSMENT OBJECTIVES/, 'point-based verify is unchanged')

console.log('build-marking-prompt.grid: all assertions passed')
