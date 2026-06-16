import assert from 'node:assert/strict'
import { topicLookupCodes } from './topic-question'

assert.deepEqual(topicLookupCodes('5.4.4'), ['5.4.4', '5.4', '5'])
assert.deepEqual(topicLookupCodes('13.1'), ['13.1', '13'])
assert.deepEqual(topicLookupCodes('P5'), ['P5'])

console.log('topic-question.test.ts: ok')
