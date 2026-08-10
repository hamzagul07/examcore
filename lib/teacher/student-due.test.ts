import { buildStudentDueTopics, type CohortDueRow } from './cohort-due'

let failed = 0
function check(label: string, ok: boolean) {
  if (!ok) {
    console.error('FAIL:', label)
    failed += 1
  }
}

const rows: CohortDueRow[] = [
  {
    userId: 's1',
    subjectCode: '9709',
    topicCode: '1.1',
    source: 'recall',
    dueAt: '2026-01-02T00:00:00Z',
  },
  {
    userId: 's1',
    subjectCode: '9709',
    topicCode: '1.2',
    source: 'attempts',
    dueAt: '2026-01-03T00:00:00Z',
  },
  {
    userId: 's1',
    subjectCode: '9709',
    topicCode: '1.1',
    source: 'attempts',
    dueAt: '2026-01-01T00:00:00Z',
  },
]

const topics = buildStudentDueTopics(rows)
check('dedupes topic', topics.filter((t) => t.topicCode === '1.1').length === 1)
check(
  'attempts wins source on dedupe',
  topics.find((t) => t.topicCode === '1.1')?.source === 'attempts'
)
check(
  'attempts before recall in sort when different topics',
  topics[0]?.source === 'attempts'
)
check(
  'names Quadratics for 1.1',
  topics.some((t) => t.topicCode === '1.1' && t.name === 'Quadratics')
)
check('empty', buildStudentDueTopics([]).length === 0)
check('limit', buildStudentDueTopics(rows, 1).length === 1)

if (failed > 0) process.exit(1)
console.log('student-due.test.ts: all checks passed')
