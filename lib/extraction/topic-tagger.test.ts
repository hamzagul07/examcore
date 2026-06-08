import assert from 'node:assert/strict'
import {
  parseTaggingResponse,
  parseBatchTaggingResponse,
  validateTopicTags,
  normalizeConfidence,
  pickStratifiedTagSample,
  applyPaper3TagReviewRule,
  clearSyllabusCache,
  TAGGING_BATCH_SIZE,
} from './topic-tagger'
import type { TaggingQuestion } from './topic-tagger'
import type { SyllabusObjective } from './types'

const objectives: SyllabusObjective[] = [
  {
    id: 'obj-1',
    subject_code: '9702',
    topic_code: '1.1',
    topic_title: 'Physical quantities',
    objective_number: '1.1.1',
    objective_text: 'define scalar and vector',
    command_words: ['define'],
    examined_in_papers: ['1'],
    syllabus_year: 2025,
    source_pdf_path: 'syllabi-source/9702.pdf',
    created_at: '',
  },
  {
    id: 'obj-2',
    subject_code: '9702',
    topic_code: '14.3',
    topic_title: 'Specific heat capacity',
    objective_number: '14.3.1',
    objective_text: 'define specific heat capacity',
    command_words: ['define'],
    examined_in_papers: ['4'],
    syllabus_year: 2025,
    source_pdf_path: 'syllabi-source/9702.pdf',
    created_at: '',
  },
  {
    id: 'obj-3',
    subject_code: '9702',
    topic_code: '1.3',
    topic_title: 'Experimental skills',
    objective_number: '1.3.1',
    objective_text: 'understand systematic and random errors',
    command_words: ['understand'],
    examined_in_papers: ['3'],
    syllabus_year: 2025,
    source_pdf_path: 'syllabi-source/9702.pdf',
    created_at: '',
  },
  {
    id: 'obj-4',
    subject_code: '9702',
    topic_code: '2.1',
    topic_title: 'Kinematics',
    objective_number: '2.1.1',
    objective_text: 'define displacement',
    command_words: ['define'],
    examined_in_papers: ['1', '2'],
    syllabus_year: 2025,
    source_pdf_path: 'syllabi-source/9702.pdf',
    created_at: '',
  },
]

const byNumber = new Map(objectives.map((o) => [o.objective_number, o]))

assert.equal(normalizeConfidence(0.85), 0.85)
assert.equal(normalizeConfidence('0.4'), 0.4)
assert.equal(normalizeConfidence(1.5), 1)
assert.equal(normalizeConfidence(-0.2), 0)
assert.equal(normalizeConfidence('bad'), null)

const parsed = parseTaggingResponse(
  '{"tags":[{"objective_number":"14.3.1","confidence":0.9},{"objective_number":"99.9.9","confidence":0.5}]}'
)
assert.equal(parsed.length, 2)

const { accepted, rejected } = validateTopicTags(parsed, byNumber)
assert.equal(accepted.length, 1)
assert.equal(accepted[0].objective_number, '14.3.1')
assert.equal(rejected.length, 1)
assert.equal(rejected[0].objective_number, '99.9.9')
assert.equal(accepted[0].needs_human_review, false)

const low = validateTopicTags(
  [{ objective_number: '1.1.1', confidence: 0.45 }],
  byNumber,
  3,
  '1'
)
assert.equal(low.accepted[0].needs_human_review, true)

const p3WrongTopic = validateTopicTags(
  [{ objective_number: '2.1.1', confidence: 0.9 }],
  byNumber,
  3,
  '3'
)
assert.equal(p3WrongTopic.accepted[0].needs_human_review, true)

const p3Threshold = validateTopicTags(
  [{ objective_number: '1.3.1', confidence: 0.7 }],
  byNumber,
  3,
  '3'
)
assert.equal(p3Threshold.accepted[0].needs_human_review, true)
assert.equal(
  applyPaper3TagReviewRule(
    [{ objective_number: '1.3.1', objective_id: 'x', topic_code: '1.3', confidence: 0.9, needs_human_review: false }],
    '3'
  )[0].needs_human_review,
  false
)

const capped = validateTopicTags(
  [
    { objective_number: '1.1.1', confidence: 0.9 },
    { objective_number: '14.3.1', confidence: 0.8 },
    { objective_number: '14.3.1', confidence: 0.7 },
    { objective_number: '14.3.1', confidence: 0.6 },
  ],
  byNumber,
  2
)
assert.equal(capped.accepted.length, 2)

const mkQ = (id: string, paper: string): TaggingQuestion => ({
  id,
  subject_code: '9702',
  paper_number: paper,
  variant: '12',
  year: 2024,
  session: 'May/June',
  question_number: id,
  question_text: 'test',
  marks: 1,
  is_leaf: true,
})

const questions = ['1', '2', '3', '4', '5'].flatMap((p) =>
  Array.from({ length: 10 }, (_, i) => mkQ(`${p}-${i}`, p))
)
const results = questions.map((q) => ({
  question_id: q.id,
  question_number: q.question_number,
  tags: [{ objective_number: '1.1.1', objective_id: 'x', topic_code: '1.1', confidence: 0.9, needs_human_review: false }],
  rejected: [],
  raw_response: '{}',
}))
const stratified = pickStratifiedTagSample(results, questions, 6, 30)
assert.equal(stratified.length, 30)
const paperCounts: Record<string, number> = {}
for (const r of stratified) {
  const q = questions.find((x) => x.id === r.question_id)!
  paperCounts[q.paper_number] = (paperCounts[q.paper_number] ?? 0) + 1
}
for (const p of ['1', '2', '3', '4', '5']) {
  assert.equal(paperCounts[p], 6)
}

assert.equal(TAGGING_BATCH_SIZE, 8)

const batchParsed = parseBatchTaggingResponse(
  JSON.stringify([
    { question_index: 1, tags: [{ objective_number: '14.3.1', confidence: 0.92 }] },
    { question_index: 2, tags: [{ objective_number: '99.9.9', confidence: 0.5 }] },
  ])
)
assert.equal(batchParsed.get(1)?.length, 1)
assert.equal(batchParsed.get(2)?.length, 1)
assert.equal(batchParsed.get(1)?.[0].objective_number, '14.3.1')

clearSyllabusCache('9702')
clearSyllabusCache()

console.log('topic-tagger.test.ts: ok')
