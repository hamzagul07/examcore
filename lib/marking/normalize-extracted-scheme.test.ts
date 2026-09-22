import assert from 'node:assert/strict'
import {
  bandsFromCriteria,
  marksFromGuidance,
  mergeSubPartQuestions,
  normaliseBands,
  normaliseCriteria,
  normalizeExtractedQuestion,
  parseMarkRange,
  partsLookComplete,
  type NormalisedCriterion,
} from './normalize-extracted-scheme'
import { validateExtractedQuestion, questionMarkingType } from './extraction-prompts'
import { tryExtractFromStorage } from './storage-extract'

// Verbatim shapes Gemini returned for 9699/12 Oct/Nov 2025 on the `mixed`
// prompt — the ones that were rejected on every run.
const FUNDING_GUIDANCE = [
  'Reward a maximum of two ways. Up to 4 marks are available for each way:',
  '',
  '1 mark for making a point/giving a way (e.g. funding body may require use of certain methods).',
  '1 mark for explaining that point (e.g. government typically requires the use of quantitative methods).',
  '1 mark for selecting relevant sociological material (e.g. social surveys).',
  '1 mark for explaining how the material supports the point (e.g. government often wants research conducted into social problems which can be represented in a numerical form. These typically require large scale survey methods).',
  '',
  '(2 x 4 marks)',
].join('\n')

const rawFunding = {
  question_number: '2(a)',
  question_text: 'Explain two ways that research might be influenced by how it is funded.',
  total_marks: 8,
  marking_type: 'point_based',
  mark_scheme: {
    indicative_content: ['Funding bodies may require a specific method'],
    marking_guidance: FUNDING_GUIDANCE,
  },
}

const rawFamily = {
  question_number: '3(a)',
  question_text: "'Family is the main influence on an individual's age identity.' Explain this view.",
  total_marks: 10,
  marking_type: 'level_of_response',
  mark_scheme: {
    type: 'level_of_response',
    indicative_content: ['Family is a key influence on all age strata'],
    levels: [
      { level: 3, marks: '8-10', descriptor: 'Good knowledge and understanding…' },
      { level: 2, marks: '4-7', descriptor: 'Some knowledge and understanding…' },
      { level: 1, marks: '1-3', descriptor: 'Limited knowledge and understanding…' },
    ],
  },
}

// --- parseMarkRange -------------------------------------------------------

assert.deepEqual(parseMarkRange('8-10'), [8, 10])
assert.deepEqual(parseMarkRange('8–10 marks'), [8, 10])
assert.deepEqual(parseMarkRange('4 to 7'), [4, 7])
assert.deepEqual(parseMarkRange('0'), [0, 0])
assert.deepEqual(parseMarkRange(6), [6, 6])
assert.equal(parseMarkRange('top band'), null)

// --- normaliseBands -------------------------------------------------------

const bands = normaliseBands(rawFamily.mark_scheme.levels)
assert.ok(bands)
assert.deepEqual(
  bands.map((b) => [b.level, b.marks_min, b.marks_max]),
  [
    [0, 0, 0],
    [1, 1, 3],
    [2, 4, 7],
    [3, 8, 10],
  ],
  'string ranges become integers, sorted, with the Level 0 band restored'
)
assert.equal(bands[3].descriptor, 'Good knowledge and understanding…')

assert.deepEqual(
  normaliseBands([
    { level: 2, marks_min: 3, marks_max: 5, descriptor: 'b' },
    { level: 1, marks_min: 1, marks_max: 2, descriptor: 'a' },
    { level: 0, marks_min: 0, marks_max: 0, descriptor: 'none' },
  ])?.map((b) => b.level),
  [0, 1, 2],
  'already-valid bands are only sorted, never duplicated'
)

assert.equal(
  normaliseBands([{ level: 1, marks: 'most of the marks' }]),
  null,
  'an unreadable range is not guessed'
)

assert.deepEqual(
  normaliseBands([
    { marks: '5-6', descriptor: 'top' },
    { marks: '3-4', descriptor: 'middle' },
    { marks: '1-2', descriptor: 'bottom' },
  ])?.map((b) => b.level),
  [0, 1, 2, 3],
  'missing level numbers are assigned bottom-up'
)

// --- marksFromGuidance ----------------------------------------------------

const fundingMarks = marksFromGuidance(FUNDING_GUIDANCE, 8)
assert.ok(fundingMarks)
assert.equal(fundingMarks.length, 8)
assert.equal(fundingMarks.reduce((s, m) => s + m.value, 0), 8)
assert.equal(fundingMarks[0].description, 'Way 1: making a point/giving a way (e.g. funding body may require use of certain methods).')
assert.equal(fundingMarks[4].description.startsWith('Way 2: '), true)
assert.deepEqual(fundingMarks.map((m) => m.id), [1, 2, 3, 4, 5, 6, 7, 8])

const strengthGuidance =
  'Reward a maximum of two strengths. For each strength, up to 3 marks are available: 1 mark for identifying a strength (e.g. changes in attitude can be tracked across time). 1 mark for explaining why the method has this strength (e.g. participants are revisited). 1 mark for explaining why it is a strength (e.g. this overcomes the snapshot effect). (2 × 3 marks)'
const strengthMarks = marksFromGuidance(strengthGuidance, 6)
assert.ok(strengthMarks)
assert.equal(strengthMarks.length, 6, 'sentences on one line split at "N mark for"')
assert.equal(strengthMarks[3].description.startsWith('Strength 2: '), true)

assert.equal(
  marksFromGuidance('1 mark for identifying. 1 mark for explaining.', 5),
  null,
  'units that do not divide the total are rejected rather than padded'
)
assert.equal(
  marksFromGuidance('Up to 4 marks are available for each way.', 8),
  null,
  '"up to" ceilings are not unit marks'
)
assert.deepEqual(
  marksFromGuidance('Award 2 marks for a full definition and 1 mark for a partial one.', 2)?.map((m) => m.value),
  [2],
  'a sentence with an alternative inside it is one unit, not two summed ones'
)

// --- normalizeExtractedQuestion ------------------------------------------

const funding = normalizeExtractedQuestion(rawFunding, 'mixed')
assert.equal(validateExtractedQuestion(funding, 'mixed', '2(a)'), true)
assert.equal(questionMarkingType(funding, 'mixed'), 'point_based')
assert.equal((funding.mark_scheme as { type: string }).type, 'point_based')
assert.equal(
  (rawFunding.mark_scheme as { marks?: unknown }).marks,
  undefined,
  'input is not mutated'
)

const family = normalizeExtractedQuestion(rawFamily, 'mixed')
assert.equal(validateExtractedQuestion(family, 'mixed', '3(a)'), true)
assert.equal(questionMarkingType(family, 'mixed'), 'level_of_response')
const familyScheme = family.mark_scheme as { bands: unknown[]; levels?: unknown }
assert.equal(familyScheme.bands.length, 4)
assert.equal(familyScheme.levels, undefined)

const mixedDeclared = normalizeExtractedQuestion(
  {
    question_number: '4',
    total_marks: 6,
    mark_scheme: {
      type: 'mixed',
      question_style: 'level_of_response',
      bands: [
        { level: 1, marks_min: 1, marks_max: 3, descriptor: 'a' },
        { level: 2, marks_min: 4, marks_max: 6, descriptor: 'b' },
      ],
    },
  },
  'mixed'
)
assert.equal(
  (mixedDeclared.mark_scheme as { type: string }).type,
  'level_of_response',
  'a `mixed` type resolves to the concrete style so the cache never routes an essay to the point prompt'
)
assert.equal(mixedDeclared.marking_type, 'level_of_response')
assert.equal(validateExtractedQuestion(mixedDeclared, 'mixed', '4'), true)

// Second drift seen on the same paper once the prompt was explicit: a correct
// eight-entry `marks` array, but written beside question_text with no
// `mark_scheme` key at all.
const flattened = {
  question_number: '2(a)',
  question_text: 'Explain two ways that research might be influenced by how it is funded.',
  total_marks: 8,
  marking_type: 'point_based',
  marks: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    type: 'B1',
    value: 1,
    description: `Way ${i < 4 ? 1 : 2}: step ${(i % 4) + 1}`,
    ecf_from: null,
    acceptable_forms: [],
  })),
  indicative_content: ['Funding bodies may require a specific method'],
  acceptable_final_answers: [],
  common_errors: [],
  notes: '',
}
const lifted = normalizeExtractedQuestion(flattened, 'mixed')
assert.equal(validateExtractedQuestion(lifted, 'mixed', '2(a)'), true, 'question-level scheme fields are lifted into mark_scheme')
const liftedScheme = lifted.mark_scheme as { type: string; marks: unknown[]; indicative_content: unknown[] }
assert.equal(liftedScheme.type, 'point_based')
assert.equal(liftedScheme.marks.length, 8)
assert.equal(liftedScheme.indicative_content.length, 1)
assert.equal(
  validateExtractedQuestion(
    normalizeExtractedQuestion({ question_number: '9', total_marks: 4, question_text: 'x' }, 'mixed'),
    'mixed',
    '9'
  ),
  false,
  'a question with no scheme anywhere is still rejected'
)

const validPoint = {
  question_number: '1',
  total_marks: 3,
  mark_scheme: {
    type: 'point_based',
    marks: [
      { id: 1, type: 'M1', value: 1, description: 'method' },
      { id: 2, type: 'A1', value: 2, description: 'answer' },
    ],
  },
}
assert.deepEqual(
  normalizeExtractedQuestion(validPoint, 'point_based').mark_scheme,
  validPoint.mark_scheme,
  'a valid point scheme passes through unchanged'
)

const perPoint = normalizeExtractedQuestion(
  {
    question_number: '5',
    total_marks: 7,
    mark_scheme: { marking_guidance: '1 mark for each valid point.' },
  },
  'mixed'
)
assert.equal(validateExtractedQuestion(perPoint, 'mixed', '5'), true)
const perPointMarks = (perPoint.mark_scheme as { marks: Array<{ description: string }> }).marks
assert.equal(perPointMarks.length, 7, '"1 mark for each valid point" on a 7-mark question is seven 1-mark entries')
assert.equal(perPointMarks[0].description, 'Point 1: valid point.')

const unmappable = {
  question_number: '5',
  total_marks: 7,
  mark_scheme: { marking_guidance: '2 marks for identifying the issue. 2 marks for explaining it.' },
}
assert.equal(
  validateExtractedQuestion(normalizeExtractedQuestion(unmappable, 'mixed'), 'mixed', '5'),
  false,
  'prose that does not resolve to the total is still rejected'
)

// --- bare-array schemes, "any N of" lists, sub-part-only extractions --------
// Verbatim shape from 9700/22 May/June 2016 Q3 under the targeted prompt: one
// row per sub-part, `mark_scheme` a bare array, and 7 creditable points for a
// 3-mark part. Every row was rejected and the student got the total-marks gate.
const bareArrayPart = {
  question_number: '3(a)(ii)',
  question_text: 'Explain the advantages of showing the data per 100000 people.',
  total_marks: 3,
  marking_type: 'point_based',
  mark_scheme: [
    { id: 1, type: 'B1', value: 1, description: 'proportion of population affected;', ecf_from: null, acceptable_forms: [] },
    { id: 2, type: 'B1', value: 1, description: 'allows comparison between countries;', ecf_from: null, acceptable_forms: [] },
    { id: 3, type: 'B1', value: 1, description: 'severity of disease;', ecf_from: null, acceptable_forms: [] },
    { id: 4, type: 'B1', value: 1, description: 'standardised for population size;', ecf_from: null, acceptable_forms: [] },
  ],
  notes: 'Max 3 marks.',
}
const wrapped = normalizeExtractedQuestion(bareArrayPart, 'point_based')
const wrappedScheme = wrapped.mark_scheme as { type: string; marks: Array<{ value: number }> }
assert.equal(wrappedScheme.type, 'point_based', 'a bare-array scheme is wrapped and typed')
assert.equal(wrappedScheme.marks.length, 4)
assert.equal(validateExtractedQuestion(wrapped, 'point_based', '3(a)(ii)'), true,
  'four creditable points for a 3-mark "max 3" part is a valid scheme')

const underProvisioned = normalizeExtractedQuestion(
  { ...bareArrayPart, total_marks: 5 },
  'point_based'
)
assert.equal(validateExtractedQuestion(underProvisioned, 'point_based'), false,
  'fewer listed marks than the total still caps strong answers and stays rejected')

const weightUnderMarksKey = normalizeExtractedQuestion(
  { question_number: '7', total_marks: 2, mark_scheme: { type: 'point_based', marks: [{ description: 'a', marks: 1 }, { description: 'b', marks: 1 }] } },
  'point_based'
)
assert.deepEqual(
  (weightUnderMarksKey.mark_scheme as { marks: Array<{ value: number; id: number }> }).marks.map((m) => [m.id, m.value]),
  [[1, 1], [2, 1]],
  'weights given as `marks` are read as `value` and ids are filled in'
)

const subParts = [
  { question_number: '3(a)(i)', question_text: 'Calculate the number of cases per 100000.', total_marks: 2, marking_type: 'point_based',
    mark_scheme: [{ id: 1, type: 'B1', value: 1, description: 'calculation shown;' }, { id: 2, type: 'B1', value: 1, description: '1179 or 1180;' }] },
  bareArrayPart,
  { question_number: '3(b)', question_text: 'Describe the trend.', total_marks: 4, marking_type: 'point_based',
    mark_scheme: [1, 2, 3, 4, 5, 6].map((i) => ({ id: i, type: 'B1', value: 1, description: `trend point ${i};` })) },
].map((q) => normalizeExtractedQuestion(q, 'point_based'))
const merged = mergeSubPartQuestions(subParts, 'point_based')
assert.equal(merged.length, 4, 'the three sub-parts are kept and a parent is added')
const parent = merged.find((q) => q.question_number === '3')!
assert.equal(parent.total_marks, 9, 'parent total is the sum of its parts')
assert.equal(validateExtractedQuestion(parent, 'point_based', '3'), true, 'the synthesised parent validates for the targeted lookup')
const parentMarks = (parent.mark_scheme as { marks: Array<{ description: string; id: number }>; parts: unknown[] }).marks
assert.equal(parentMarks.length, 12)
assert.equal(parentMarks[0].description, '(a)(i): calculation shown;')
assert.equal(parentMarks[2].description, '(a)(ii) [max 3]: proportion of population affected;', 'over-provisioned parts carry their cap in the label')
assert.deepEqual(parentMarks.map((m) => m.id), Array.from({ length: 12 }, (_, i) => i + 1), 'ids are renumbered across the merged list')
assert.equal((parent.mark_scheme as { parts: unknown[] }).parts.length, 3)
assert.match(String(parent.question_text), /^\(a\)\(i\) Calculate .* \[2\]\n\n\(a\)\(ii\)/)

const withParent = mergeSubPartQuestions(
  [...subParts, normalizeExtractedQuestion({ question_number: '3', total_marks: 9, marking_type: 'point_based', mark_scheme: { marks: Array.from({ length: 9 }, (_, i) => ({ id: i + 1, value: 1, description: `p${i}` })) } }, 'point_based')],
  'point_based'
)
assert.equal(withParent.filter((q) => q.question_number === '3').length, 1, 'no synthesis when the model already returned the parent')

const essayParts = [
  { question_number: '4(a)', total_marks: 8, marking_type: 'level_of_response', mark_scheme: { bands: [{ level: 1, marks_min: 0, marks_max: 8, descriptor: 'x' }] } },
  { question_number: '4(b)', total_marks: 12, marking_type: 'level_of_response', mark_scheme: { bands: [{ level: 1, marks_min: 0, marks_max: 12, descriptor: 'y' }] } },
].map((q) => normalizeExtractedQuestion(q, 'mixed'))
const twoEssays = mergeSubPartQuestions(essayParts, 'mixed')
assert.equal(twoEssays.length, 3, 'two essay parts synthesise a parent too')
assert.equal(twoEssays[2].marking_type, 'mixed')
assert.equal(twoEssays[2].total_marks, 20)

// --- mixed whole question: point parts + an essay part (9609/32 Q3) ---------
const mixedParts = [
  { question_number: '3(a)', question_text: 'Identify one method.', total_marks: 1, marking_type: 'point_based',
    mark_scheme: { type: 'point_based', marks: [{ id: 1, type: 'B1', value: 1, description: 'a valid method;' }] } },
  { question_number: '3(b)', question_text: 'Calculate the change.', total_marks: 3, marking_type: 'point_based',
    mark_scheme: { type: 'point_based', marks: [{ id: 1, type: 'M1', value: 1, description: 'method;' }, { id: 2, type: 'A1', value: 1, description: 'answer;' }, { id: 3, type: 'B1', value: 1, description: 'units;' }, { id: 4, type: 'B1', value: 1, description: 'alternative route;' }] } },
  { question_number: '3(c)', question_text: 'Evaluate whether the business should expand.', total_marks: 12, marking_type: 'level_of_response',
    mark_scheme: { type: 'level_of_response', criteria: [
      { id: 'AO1', name: 'Knowledge', max_marks: 2, bands: [{ level: 1, marks_min: 1, marks_max: 2, descriptor: 'k' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
      { id: 'AO2', name: 'Application', max_marks: 2, bands: [{ level: 1, marks_min: 1, marks_max: 2, descriptor: 'a' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
      { id: 'AO3', name: 'Analysis', max_marks: 2, bands: [{ level: 1, marks_min: 1, marks_max: 2, descriptor: 'x' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
      { id: 'AO4', name: 'Evaluation', max_marks: 6, bands: [{ level: 3, marks_min: 5, marks_max: 6, descriptor: 'e3' }, { level: 2, marks_min: 3, marks_max: 4, descriptor: 'e2' }, { level: 1, marks_min: 1, marks_max: 2, descriptor: 'e1' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
    ], indicative_content: ['…'] } },
].map((q) => normalizeExtractedQuestion(q, 'mixed'))
const mixed = mergeSubPartQuestions(mixedParts, 'mixed')
assert.equal(mixed.length, 4)
const mixedParent = mixed.find((q) => q.question_number === '3')!
assert.equal(mixedParent.marking_type, 'mixed')
assert.equal(mixedParent.total_marks, 16, 'parent total = 1 + 3 + 12')
const mixedScheme = mixedParent.mark_scheme as { type: string; sections: Array<{ part: string; type: string; total_marks: number }>; marks: Array<{ id: number; part: string; description: string }>; criteria: Array<{ id: string; max_marks: number }>; bands: unknown[] }
assert.equal(mixedScheme.type, 'mixed')
assert.deepEqual(mixedScheme.sections.map((s) => [s.part, s.type, s.total_marks]), [['(a)', 'point_based', 1], ['(b)', 'point_based', 3], ['(c)', 'level_of_response', 12]])
assert.deepEqual(mixedScheme.marks.map((m) => m.id), [1, 2, 3, 4, 5], 'point marks are renumbered across parts')
assert.equal(mixedScheme.marks[1].part, '(b)')
assert.match(mixedScheme.marks[1].description, /^\(b\) \[max 3\]: method;/, 'an "any 3 of 4" part carries its cap')
assert.deepEqual(mixedScheme.criteria.map((c) => [c.id, c.max_marks]), [['(c) AO1', 2], ['(c) AO2', 2], ['(c) AO3', 2], ['(c) AO4', 6]], 'the essay objectives are named by part')
assert.ok(Array.isArray(mixedScheme.bands) && mixedScheme.bands.length > 0, 'a display scale is carried')
assert.equal(validateExtractedQuestion(mixedParent, 'mixed', '3'), true, 'the mixed parent validates section by section')
assert.equal(validateExtractedQuestion({ ...mixedParent, total_marks: 15 }, 'mixed', '3'), false, 'section totals must sum to the question total')

const withMcq = mergeSubPartQuestions([mixedParts[0], normalizeExtractedQuestion({ question_number: '3(b)', total_marks: 1, marking_type: 'mcq', mark_scheme: { type: 'mcq', answer_key: { '3(b)': 'C' } } }, 'mixed')], 'mixed')
assert.equal(withMcq.some((q) => q.question_number === '3'), false, 'an MCQ part blocks the synthesis')

assert.equal(partsLookComplete(['(a)(i)', '(a)(ii)', '(b)', '(c)', '(d)']), true)
assert.equal(partsLookComplete(['(a)', '(b)(i)', '(b)(ii)']), true)
assert.equal(partsLookComplete(['(a)(ii)', '(b)(ii)']), false, 'a subset with gaps is not a whole question')
assert.equal(partsLookComplete(['(b)', '(c)']), false, 'parts must start at (a)')
assert.equal(partsLookComplete(['(a)', '(c)']), false, 'a missing letter is a gap')
assert.equal(partsLookComplete([]), false)
const partialOnly = mergeSubPartQuestions(
  [subParts[1], normalizeExtractedQuestion({ question_number: '3(c)', total_marks: 2, marking_type: 'point_based', mark_scheme: [{ id: 1, value: 1, description: 'x' }, { id: 2, value: 1, description: 'y' }] }, 'point_based')],
  'point_based'
)
assert.equal(partialOnly.some((q) => q.question_number === '3'), false, 'no parent is synthesised from an incomplete set of parts')

async function subPartsOnlyNowCaches(): Promise<void> {
  const upserted: Record<string, unknown>[] = []
  const found: string[] = []
  const result = await tryExtractFromStorage(
    '9700/22',
    'May/June 2016',
    '3',
    {
      downloadPdf: async () => new ArrayBuffer(8),
      extractFromPdfs: async () => JSON.stringify({ paper_marking_type: 'point_based', questions: [
        { question_number: '3(a)(i)', question_text: 'Calculate.', total_marks: 2, marking_type: 'point_based',
          mark_scheme: [{ id: 1, type: 'B1', value: 1, description: 'calculation;' }, { id: 2, type: 'B1', value: 1, description: 'answer;' }] },
        bareArrayPart,
        { question_number: '4', question_text: 'Unrelated.', total_marks: 1, marking_type: 'point_based',
          mark_scheme: [{ id: 1, type: 'B1', value: 1, description: 'x;' }] },
      ] }),
      upsertSchemes: async (rows) => { upserted.push(...rows) },
      findScheme: async (paperCode, paperSession, questionNumber) => {
        found.push(questionNumber)
        return { id: 'row-3', paper_code: paperCode, paper_session: paperSession, question_number: questionNumber } as unknown as Awaited<ReturnType<typeof tryExtractFromStorage>>
      },
    },
    { mode: 'targeted', targetQuestion: '3' }
  )
  assert.ok(result, 'a sub-parts-only extraction now yields a scheme for the question asked for')
  assert.deepEqual(
    upserted.map((r) => r.question_number).sort(),
    ['3', '3(a)(i)', '3(a)(ii)'],
    'the synthesised parent and its sub-parts are cached; the unrelated question is not'
  )
  const parentRow = upserted.find((r) => r.question_number === '3')!
  assert.equal(parentRow.total_marks, 5)
  assert.equal(parentRow.marking_type, 'point_based')
  assert.deepEqual(found, ['3'])
}

// --- assessment-objective grids (Cambridge essays) -------------------------
// Shape of 9609/42 May/June 2023 Q1: one column per AO, each with its own
// levels; examiners award each AO and sum. Previously flattened to one scale.
const gridQuestion = {
  question_number: '1',
  question_text: 'Evaluate the extent to which leadership contributed to BV\'s effective strategic management.',
  total_marks: 20,
  marking_type: 'level_of_response',
  mark_scheme: {
    type: 'level_of_response',
    criteria: [
      { id: 'AO1', name: 'Knowledge and understanding', max_marks: 3, bands: [
        { level: 2, marks_min: 2, marks_max: 3, descriptor: 'Developed knowledge…' },
        { level: 1, marks_min: 1, marks_max: 1, descriptor: 'Limited knowledge…' },
        { level: 0, marks_min: 0, marks_max: 0, descriptor: 'No creditable response.' } ] },
      { objective: 'ao2', name: 'Application', marks: 2, levels: [
        { level: 2, marks: '2', descriptor: 'Developed application…' },
        { level: 1, marks: '1', descriptor: 'Limited application…' } ] },
      { id: 'AO3', name: 'Analysis', max_marks: 8, bands: [
        { level: 3, marks_min: 7, marks_max: 8, descriptor: 'Developed analysis of the overall strategy…' },
        { level: 2, marks_min: 4, marks_max: 6, descriptor: 'Developed analysis of individual elements…' },
        { level: 1, marks_min: 1, marks_max: 3, descriptor: 'Limited analysis…' },
        { level: 0, marks_min: 0, marks_max: 0, descriptor: 'No creditable response.' } ] },
      { id: 'AO4', name: 'Evaluation', max_marks: 7, bands: [
        { level: 3, marks_min: 6, marks_max: 7, descriptor: 'Effective evaluation…' },
        { level: 2, marks_min: 3, marks_max: 5, descriptor: 'Developed evaluation…' },
        { level: 1, marks_min: 1, marks_max: 2, descriptor: 'Limited evaluation…' },
        { level: 0, marks_min: 0, marks_max: 0, descriptor: 'No creditable response.' } ] },
    ],
    indicative_content: ['AO1 Knowledge and understanding: …'],
  },
}
const grid = normalizeExtractedQuestion(gridQuestion, 'level_of_response')
const gridScheme = grid.mark_scheme as { criteria: NormalisedCriterion[]; bands: Array<{ level: number; marks_min: number; marks_max: number }> }
assert.equal(gridScheme.criteria.length, 4)
assert.deepEqual(gridScheme.criteria.map((c) => c.id), ['AO1', 'AO2', 'AO3', 'AO4'], 'objective ids are read from id/objective aliases and upper-cased')
assert.equal(gridScheme.criteria[1].max_marks, 2, 'max read from the `marks` alias')
assert.deepEqual(gridScheme.criteria[1].bands.map((b) => [b.level, b.marks_min, b.marks_max]), [[0, 0, 0], [1, 1, 1], [2, 2, 2]], 'string ranges and the missing Level 0 are normalised per objective')
assert.equal(validateExtractedQuestion(grid, 'level_of_response', '1'), true, 'a complete grid whose maxima sum to the total validates')
assert.ok(Array.isArray(gridScheme.bands) && gridScheme.bands.length > 0, 'an overall scale is synthesised when the extractor returned only the grid')
assert.equal(gridScheme.bands.at(-1)!.marks_max, 20, 'the synthesised top band reaches the question total')

const shortGrid = normalizeExtractedQuestion({ ...gridQuestion, total_marks: 25 }, 'level_of_response')
assert.equal(validateExtractedQuestion(shortGrid, 'level_of_response', '1'), false, 'objective maxima that do not sum to the total are rejected')

const brokenColumn = normalizeExtractedQuestion({ ...gridQuestion, mark_scheme: { ...gridQuestion.mark_scheme, criteria: [gridQuestion.mark_scheme.criteria[0], { id: 'AO3', max_marks: 8, bands: [{ level: 3, marks_min: 7, marks_max: 8, descriptor: 'x' }] }] } }, 'level_of_response')
assert.equal(validateExtractedQuestion(brokenColumn, 'level_of_response', '1'), false, 'a column whose levels do not tile 0..max is rejected')
assert.equal(normaliseCriteria([{ id: 'AO1', max_marks: 3, bands: 'not bands' }]), null, 'an unreadable column makes the whole grid null rather than a partial grid')

const invented = normaliseCriteria([{ id: 'AO2', name: 'Application', max_marks: 2, bands: [
  { level: 3, marks_min: 2, marks_max: 2, descriptor: 'Developed application' },
  { level: 2, marks_min: 2, marks_max: 2, descriptor: 'Developed application' },
  { level: 1, marks_min: 1, marks_max: 1, descriptor: 'Limited application' },
  { level: 0, marks_min: 0, marks_max: 0, descriptor: 'None' } ] }])!
assert.deepEqual(invented[0].bands.map((b) => [b.level, b.marks_min, b.marks_max]), [[0, 0, 0], [1, 1, 1], [2, 2, 2]], 'a level the model invented by repeating the range below is dropped')
assert.equal(validateExtractedQuestion({ question_number: '1', total_marks: 2, marking_type: 'level_of_response', mark_scheme: { type: 'level_of_response', criteria: invented } }, 'level_of_response', '1'), true)

const carved = normaliseCriteria([{ id: 'AO1', name: 'Knowledge', max_marks: 3, bands: [
  { level: 3, marks_min: 3, marks_max: 3, descriptor: 'Developed knowledge' },
  { level: 2, marks_min: 2, marks_max: 3, descriptor: 'Developed knowledge' },
  { level: 1, marks_min: 1, marks_max: 1, descriptor: 'Limited knowledge' },
  { level: 0, marks_min: 0, marks_max: 0, descriptor: 'None' } ] }])!
assert.deepEqual(carved[0].bands.map((b) => [b.level, b.marks_min, b.marks_max]), [[0, 0, 0], [1, 1, 1], [2, 2, 3]], 'a level carved out of the range below is dropped and the printed range kept')

const oddIds = normaliseCriteria([
  { id: 'A01 Knowledge and understanding', max_marks: 2, bands: [{ level: 1, marks_min: 1, marks_max: 2, descriptor: 'k' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
  { id: 'AO2: Application', name: '', max_marks: 2, bands: [{ level: 1, marks_min: 1, marks_max: 2, descriptor: 'a' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
  { objective: 'ao3', name: 'Analysis', max_marks: 4, bands: [{ level: 1, marks_min: 1, marks_max: 4, descriptor: 'x' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'n' }] },
])!
assert.deepEqual(oddIds.map((c) => [c.id, c.name]), [['AO1', 'Knowledge and understanding'], ['AO2', 'Application'], ['AO3', 'Analysis']], 'a zero for O, a trailing name and a bare code all canonicalise to AO<n>')

const synthesised = bandsFromCriteria(gridScheme.criteria)
assert.deepEqual(synthesised.map((b) => b.level), [0, 1, 2, 3])
assert.equal(synthesised[3].marks_max, 20)

const plainLor = normalizeExtractedQuestion({ question_number: '2', total_marks: 10, marking_type: 'level_of_response', mark_scheme: { type: 'level_of_response', bands: [
  { level: 2, marks_min: 6, marks_max: 10, descriptor: 'a' }, { level: 1, marks_min: 1, marks_max: 5, descriptor: 'b' }, { level: 0, marks_min: 0, marks_max: 0, descriptor: 'c' } ] } }, 'level_of_response')
assert.equal('criteria' in (plainLor.mark_scheme as object), false, 'a plain band scale gains no criteria field')
assert.equal(validateExtractedQuestion(plainLor, 'level_of_response', '2'), true)

// --- through tryExtractFromStorage ----------------------------------------

async function rejectedShapeNowCaches(): Promise<void> {
  const upserted: Record<string, unknown>[] = []
  const result = await tryExtractFromStorage(
    '9699/12',
    'October/November 2025',
    '2(a)',
    {
      downloadPdf: async () => new ArrayBuffer(1),
      extractFromPdfs: async () =>
        JSON.stringify({ paper_marking_type: 'mixed', questions: [rawFunding] }),
      upsertSchemes: async (rows) => {
        upserted.push(...rows)
      },
      findScheme: async () =>
        upserted.length
          ? ({
              id: 'row',
              ...upserted[0],
            } as never)
          : null,
    },
    { mode: 'targeted', targetQuestion: '2(a)' }
  )
  assert.ok(result, 'the official 9699 scheme is now accepted')
  assert.equal(upserted.length, 1)
  assert.equal(upserted[0].marking_type, 'point_based')
  const scheme = upserted[0].mark_scheme as { type: string; marks: Array<{ value: number }> }
  assert.equal(scheme.type, 'point_based')
  assert.equal(scheme.marks.reduce((s, m) => s + m.value, 0), 8)
}

Promise.all([rejectedShapeNowCaches(), subPartsOnlyNowCaches()])
  .then(() => console.log('normalize-extracted-scheme: all assertions passed'))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
