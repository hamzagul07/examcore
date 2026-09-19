import assert from 'node:assert/strict'
import {
  marksFromGuidance,
  normaliseBands,
  normalizeExtractedQuestion,
  parseMarkRange,
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

rejectedShapeNowCaches()
  .then(() => console.log('normalize-extracted-scheme: all assertions passed'))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
