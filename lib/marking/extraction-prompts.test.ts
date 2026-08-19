import assert from 'node:assert/strict'
import { validateExtractedQuestion } from './extraction-prompts'
import { tryExtractFromStorage } from './storage-extract'

function pointQuestion(
  questionNumber: string,
  totalMarks: number,
  weights: number[]
): Record<string, unknown> {
  return {
    question_number: questionNumber,
    question_text: 'Calculate the requested value.',
    total_marks: totalMarks,
    mark_scheme: {
      type: 'point_based',
      marks: weights.map((value, index) => ({
        id: index + 1,
        type: 'M1',
        value,
        description: 'Valid method.',
      })),
    },
  }
}

assert.equal(
  validateExtractedQuestion(
    pointQuestion('4', 8, [1, 1, 1, 1, 1]),
    'point_based',
    '4'
  ),
  false,
  'five extracted points cannot become the official rubric for an eight-mark question'
)
assert.equal(
  validateExtractedQuestion(
    pointQuestion('4', 8, [2, 2, 2, 2]),
    'point_based',
    '4'
  ),
  true
)
assert.equal(
  validateExtractedQuestion(
    pointQuestion('5', 8, [2, 2, 2, 2]),
    'point_based',
    '4'
  ),
  false,
  'an extraction for a different question cannot be cached under the request'
)

const levelQuestion = {
  question_number: '6',
  total_marks: 5,
  mark_scheme: {
    type: 'level_of_response',
    bands: [
      { level: 0, marks_min: 0, marks_max: 0 },
      { level: 1, marks_min: 1, marks_max: 2 },
      { level: 2, marks_min: 3, marks_max: 5 },
    ],
  },
}
assert.equal(
  validateExtractedQuestion(levelQuestion, 'level_of_response', '6'),
  true
)
assert.equal(
  validateExtractedQuestion(
    {
      ...levelQuestion,
      mark_scheme: {
        type: 'level_of_response',
        bands: [
          { level: 0, marks_min: 0, marks_max: 0 },
          { level: 1, marks_min: 2, marks_max: 3 },
          { level: 2, marks_min: 3, marks_max: 5 },
        ],
      },
    },
    'level_of_response',
    '6'
  ),
  false,
  'gapped or overlapping bands do not span a trustworthy 0..total scale'
)

async function extractionDoesNotPersistInvalidRubric(): Promise<void> {
  let upsertCount = 0
  const errors: string[] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  }
  try {
    const result = await tryExtractFromStorage(
      '9709/21',
      'May/June 2025',
      '4',
      {
        downloadPdf: async () => new ArrayBuffer(1),
        extractFromPdfs: async () =>
          JSON.stringify({
            questions: [pointQuestion('4', 8, [1, 1, 1, 1, 1])],
          }),
        upsertSchemes: async () => {
          upsertCount += 1
        },
        findScheme: async () => null,
      },
      { mode: 'targeted', targetQuestion: '4' }
    )

    assert.equal(result, null)
    assert.equal(upsertCount, 0, 'invalid extraction must never reach the cache upsert')
    assert.ok(
      errors.some((message) => message.includes('Rejected extracted mark scheme')),
      'the rejection must be observable in server logs'
    )
  } finally {
    console.error = originalError
  }
}

extractionDoesNotPersistInvalidRubric()
  .then(() => console.log('extraction-prompts: all assertions passed'))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
