import { nextRecallInterval, selectDueRecall, type RecallRow } from './recall-schedule'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// --- interval growth ---

check('first completion moves 3 -> 7', nextRecallInterval(3, 5, 5) === 7)
check('then 7 -> 16', nextRecallInterval(7, 5, 5) === 16)
check('then 16 -> 35', nextRecallInterval(16, 3, 3) === 35)
check('caps at 60', nextRecallInterval(35, 3, 3) === 60)
check('stays capped', nextRecallInterval(60, 3, 3) === 60)

// A partial pass is not evidence it stuck, so the interval must not expand.
check('partial pass holds the interval', nextRecallInterval(7, 3, 5) === 7)
check('zero answered holds', nextRecallInterval(16, 0, 5) === 16)
// Guard the degenerate case: no questions cannot count as a completion.
check('empty quiz does not expand', nextRecallInterval(3, 0, 0) === 3)

// --- due selection ---

const NOW = Date.parse('2026-07-26T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString()

const row = (over: Partial<RecallRow> = {}): RecallRow => ({
  subject_code: '9702',
  lesson_slug: 'a',
  topic_code: '1.1',
  answered_count: 3,
  total_count: 3,
  due_at: daysAgo(1),
  last_worked_at: daysAgo(5),
  ...over,
})

const none = new Set<string>()

check('a due row surfaces', selectDueRecall([row()], none, NOW).length === 1)
check('a not-yet-due row is held back', selectDueRecall([row({ due_at: inDays(2) })], none, NOW).length === 0)
check('due exactly now surfaces', selectDueRecall([row({ due_at: new Date(NOW).toISOString() })], none, NOW).length === 1)

// A marked attempt on the topic is a stronger signal and the attempt-driven
// queue already covers it — showing both would list the topic twice.
check(
  'suppressed once marked on that topic',
  selectDueRecall([row()], new Set(['9702::1.1']), NOW).length === 0
)
check(
  'a different topic does not suppress',
  selectDueRecall([row()], new Set(['9702::2.4']), NOW).length === 1
)
check(
  'same topic in another subject does not suppress',
  selectDueRecall([row()], new Set(['9701::1.1']), NOW).length === 1
)

check(
  'stalest first',
  selectDueRecall(
    [
      row({ lesson_slug: 'recent', last_worked_at: daysAgo(4) }),
      row({ lesson_slug: 'stale', last_worked_at: daysAgo(30) }),
    ],
    none,
    NOW
  )[0].lessonSlug === 'stale'
)

check('daysSince computed', selectDueRecall([row({ last_worked_at: daysAgo(9) })], none, NOW)[0].daysSince === 9)
check('malformed due_at is skipped', selectDueRecall([row({ due_at: 'not-a-date' })], none, NOW).length === 0)
check('row with no slug is skipped', selectDueRecall([row({ lesson_slug: '' })], none, NOW).length === 0)

if (failed > 0) process.exit(1)
console.log('recall-schedule.test.ts: all checks passed')
