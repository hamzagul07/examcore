import assert from 'node:assert/strict'
import {
  applyTopicQuestionToPaperSelection,
  topicLookupCodes,
} from './topic-question'
import { getStaticTopicFallback } from './topic-fallbacks'

assert.deepEqual(topicLookupCodes('5.4.4'), ['5.4.4', '5.4', '5'])
assert.deepEqual(topicLookupCodes('13.1'), ['13.1', '13'])
assert.deepEqual(topicLookupCodes('P5'), ['P5'])

const beFallback = getStaticTopicFallback('9609', ['5.4.4', '5.4', '5'])
assert.ok(beFallback?.paper_code === '9609/22')
assert.ok(beFallback?.question_text?.includes('break-even'))

const selection = applyTopicQuestionToPaperSelection({
  paper_code: '9609/22',
  paper_session: 's23',
  question_number: '2',
  question_text: null,
  total_marks: 8,
  matched_topic: '5.4.4',
})
assert.deepEqual(selection, {
  subject: '9609',
  component: '22',
  session: 'May/June',
  year: 2023,
  questionNumber: '2',
})

const longSession = applyTopicQuestionToPaperSelection({
  paper_code: '9706/22',
  paper_session: 'May/June 2023',
  question_number: '2',
  question_text: null,
  total_marks: 8,
  matched_topic: '2.2.4',
})
assert.equal(longSession?.year, 2023)
assert.equal(longSession?.session, 'May/June')

console.log('topic-question.test.ts: ok')
