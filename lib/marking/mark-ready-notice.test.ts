import assert from 'node:assert/strict'
import { markReadyNoticeFromPayload } from '@/lib/marking/mark-ready-notice'

// One builder for both /api/mark/process paths — the JSON path used to send
// nothing because the notice lived inline in the SSE branch.
const notice = markReadyNoticeFromPayload(
  'user-1',
  {
    attempt_id: 'a1',
    marks_earned: 5,
    total_marks: 8,
    subject_code: '9708',
    paper_code: '9708/22',
    ai_marking: {
      weak_topics: ['Analysis (AO3)', 7, null],
      what_to_study_next: 'Award M1 for rearranging.',
      shareable_takeaway: 'Show every step of your working.',
    },
  },
  7
)
assert.equal(notice.userId, 'user-1')
assert.equal(notice.attemptId, 'a1')
assert.equal(notice.marksEarned, 5)
assert.equal(notice.totalMarks, 8)
assert.equal(notice.subjectCode, '9708')
assert.equal(notice.subjectLabel, 'Economics')
assert.equal(notice.paperRef, '9708/22')
assert.equal(notice.predictedMarks, 7)
assert.deepEqual(notice.weakTopics, ['Analysis (AO3)'], 'non-strings are dropped, not mailed as "7"')
assert.equal(notice.shareableTakeaway, 'Show every step of your working.')
assert.ok(!('whatToStudyNext' in notice), 'the in-app study note never reaches the email')

const bare = markReadyNoticeFromPayload(null, undefined)
assert.equal(bare.userId, null)
assert.equal(bare.attemptId, null)
assert.equal(bare.subjectCode, null)
assert.equal(bare.weakTopics, null)
assert.equal(bare.predictedMarks, null)

const odd = markReadyNoticeFromPayload('u', { marks_earned: '5', total_marks: NaN, ai_marking: 'nope', subject_code: '  ' })
assert.equal(odd.marksEarned, null, 'a string score is not a score')
assert.equal(odd.subjectCode, null)
assert.equal(odd.weakTopics, null)
const blank = markReadyNoticeFromPayload('u', { ai_marking: { shareable_takeaway: '   ' } })
assert.equal(blank.shareableTakeaway, null, 'the model said nothing shareable — send nothing')

console.log('mark-ready-notice.test.ts: ok')
