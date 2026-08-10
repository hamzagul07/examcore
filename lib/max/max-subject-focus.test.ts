import assert from 'node:assert/strict'
import { pickFocusSubjectCode } from '@/lib/max/vault-data'
import type { AttemptLite } from '@/lib/mastery'

const subjects = [
  { code: '9709', name: 'Mathematics' },
  { code: '9702', name: 'Physics' },
  { code: '9700', name: 'Biology' },
]

assert.equal(
  pickFocusSubjectCode(subjects, [], '9702'),
  '9702',
  'honours ?subject= override'
)

assert.equal(
  pickFocusSubjectCode(subjects, [], '9618'),
  '9618',
  'override works even when not on profile list'
)

assert.equal(
  pickFocusSubjectCode(subjects, [], null),
  '9709',
  'falls back to first treed subject when no attempts'
)

const attempts = [
  {
    id: '1',
    marks_earned: 8,
    total_marks: 10,
    syllabus_tags: [],
    created_at: '2026-01-02',
    mark_schemes: { paper_code: '9702/11' },
  },
  {
    id: '2',
    marks_earned: 2,
    total_marks: 10,
    syllabus_tags: [],
    created_at: '2026-01-01',
    mark_schemes: { paper_code: '9702/12' },
  },
  {
    id: '3',
    marks_earned: 9,
    total_marks: 10,
    syllabus_tags: [],
    created_at: '2026-01-03',
    mark_schemes: { paper_code: '9709/11' },
  },
  {
    id: '4',
    marks_earned: 9,
    total_marks: 10,
    syllabus_tags: [],
    created_at: '2026-01-04',
    mark_schemes: { paper_code: '9709/12' },
  },
] as unknown as AttemptLite[]

assert.equal(
  pickFocusSubjectCode(subjects, attempts, null),
  '9702',
  'picks weakest subject with enough attempts'
)

console.log('max-subject-focus.test.ts: ok')
