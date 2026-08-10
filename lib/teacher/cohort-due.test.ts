import {
  buildCohortDueList,
  countDueByStudent,
  type CohortDueRow,
} from './cohort-due'

let failed = 0
function check(label: string, ok: boolean) {
  if (!ok) {
    console.error('FAIL:', label)
    failed += 1
  }
}

const rows: CohortDueRow[] = [
  {
    userId: 'a',
    subjectCode: '9702',
    topicCode: '1.1',
    source: 'attempts',
    dueAt: '2026-01-01T00:00:00Z',
  },
  {
    userId: 'b',
    subjectCode: '9702',
    topicCode: '1.1',
    source: 'recall',
    dueAt: '2026-01-01T00:00:00Z',
  },
  {
    userId: 'a',
    subjectCode: '9702',
    topicCode: '1.1',
    source: 'recall',
    dueAt: '2026-01-02T00:00:00Z',
  },
  {
    userId: 'c',
    subjectCode: '9702',
    topicCode: '2.1',
    source: 'attempts',
    dueAt: '2026-01-01T00:00:00Z',
  },
]

const list = buildCohortDueList({
  totalStudents: 10,
  rows,
  names: { a: 'Ada', b: 'Ben', c: 'Cia' },
  topicNames: {
    '9702::1.1': 'Forces',
    '9702::2.1': 'Waves',
  },
  subjectLabels: { '9702': 'Physics' },
})

check('two topics', list.length === 2)
check('1.1 has two students (deduped)', list[0]?.topicCode === '1.1' && list[0].studentsDue === 2)
check('named Forces', list[0]?.name === 'Forces')
check('source both', list[0]?.source === 'both')
check('due pct', list[0]?.duePct === 20)
check('samples', list[0]?.sampleNames.join(',') === 'Ada,Ben')
check('second is Waves', list[1]?.name === 'Waves' && list[1].studentsDue === 1)

check(
  'empty roster',
  buildCohortDueList({ totalStudents: 0, rows, names: {} }).length === 0
)
check(
  'no rows',
  buildCohortDueList({ totalStudents: 5, rows: [], names: {} }).length === 0
)

const counts = countDueByStudent(rows)
check('a has 1 unique topic', counts.a === 1)
check('b has 1', counts.b === 1)
check('c has 1', counts.c === 1)
check(
  'dedupe attempt+recall',
  countDueByStudent([
    rows[0],
    { ...rows[0], source: 'recall', dueAt: '2026-01-02T00:00:00Z' },
  ]).a === 1
)

if (failed > 0) process.exit(1)
console.log('cohort-due.test.ts: all checks passed')
