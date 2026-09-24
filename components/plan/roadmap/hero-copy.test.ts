import assert from 'node:assert/strict'
import { NEXT_IN_SYLLABUS } from '@/lib/plan/modes'
import { DAY_ONE_LINE, normaliseDay, type RoadmapDay, type RoadmapTask } from '@/lib/plan/roadmap-view'
import { FORBIDDEN_NUDGE_WORDS } from '@/lib/plan/roadmap-types'
import { countdownLine, firstTaskOn, heroChips, heroCopy, taskSubtitle } from '@/components/plan/roadmap/hero-copy'
import { nowMinuteInZone } from '@/components/plan/roadmap/zone-clock'

function day(date: string, blocks: Array<Partial<RoadmapTask> & { kind: RoadmapTask['kind']; minutes: number; label: string }>, kind: RoadmapDay['kind'] = 'study'): RoadmapDay {
  const work = blocks.filter((b) => b.kind === 'drill' || b.kind === 'learn' || b.kind === 'review' || b.kind === 'timed_paper')
  return normaliseDay({
    day: 1,
    date,
    daysLeft: 5,
    kind,
    focus: kind === 'rest' ? 'Rest day.' : 'Maths — two blocks.',
    workMinutes: work.reduce((n, b) => n + b.minutes, 0),
    blocks,
  })
}

const t1 = { kind: 'drill' as const, minutes: 25, label: 'Differentiation — one question', subjectLabel: 'Mathematics', topic: { code: '1.1', name: 'Differentiation', source: 'syllabus' as const, weight: 0 }, objective: 'Complete one chain-rule question and check the M1 step.', startsAt: '16:00', endsAt: '16:25' }
const today = day('2026-09-17', [t1, { kind: 'break', minutes: 5, label: '5 min off' }, { ...t1, label: 'b', objective: 'Second one.' }])
const tomorrow = day('2026-09-18', [{ ...t1, objective: 'Open with the M1 step.', startsAt: '17:00' }])
const plan = { days: [today, tomorrow] }
const ctx = { plan, day: today, todayIso: '2026-09-17', studiedLine: "You've studied on 2 of the last 3 days." }

// --- chips ---------------------------------------------------------------------

assert.deepEqual(heroChips({ why: [] }), [], 'no evidence, no chips')
assert.deepEqual(
  heroChips({ why: [{ type: 'on_syllabus', source: 'syllabus', confidence: 'high', explanation: 'x' }] }),
  [NEXT_IN_SYLLABUS],
  'only on_syllabus reads as the plain line'
)
assert.deepEqual(
  heroChips({
    why: [
      { type: 'on_syllabus', source: 'syllabus', confidence: 'high', explanation: 'x' },
      { type: 'weak_area', source: 'user_performance', confidence: 'high', explanation: 'x' },
      { type: 'frequency', source: 'indexed_papers', confidence: 'medium', explanation: 'x', stat: { n: 7, of: 9 } },
      { type: 'review_due', source: 'plan', confidence: 'high', explanation: 'x' },
    ],
  }),
  ['Your weak area', 'In 7 of 9 indexed past papers'],
  'at most two, the specific ones first'
)
{
  // The loop copies the topic's evidence onto every step; the self-rating chip belongs to the diagnostic alone.
  const why = [
    { type: 'self_rated' as const, source: 'self_report' as const, confidence: 'low' as const, explanation: 'x' },
    { type: 'frequency' as const, source: 'indexed_papers' as const, confidence: 'medium' as const, explanation: 'x', stat: { n: 9, of: 9 } },
  ]
  assert.deepEqual(heroChips({ why, taskType: 'concept' }), ['In 9 of 9 indexed past papers'], 'a concept task drops the self-rating chip')
  assert.deepEqual(heroChips({ why, taskType: 'diagnostic' }), ['From your self-rating', 'In 9 of 9 indexed past papers'], 'the diagnostic keeps it')
  assert.deepEqual(heroChips({ why: [why[0]!], taskType: 'concept' }), [NEXT_IN_SYLLABUS], 'with nothing specific left it reads as the plain line, not a stale chip')
  for (const type of ['concept', 'recall', 'worked_example', 'question', 'timed_set', 'review'] as const) {
    assert.ok(!heroChips({ why, taskType: type }).some((c) => /checks where you stand/i.test(c)), `${type} never says "Checks where you stand"`)
  }
}

assert.equal(taskSubtitle(t1), 'Mathematics · Differentiation')
assert.equal(taskSubtitle({ subjectLabel: 'Physics' }), 'Physics')
assert.equal(taskSubtitle({}), undefined)

// --- hero copy -------------------------------------------------------------------

{
  const c = heroCopy({ kind: 'task', task: today.blocks[0]!, minutes: 25, shortened: false }, ctx)
  assert.equal(c.eyebrow, 'Up next · Past-paper question · 25 min')
  assert.equal(c.title, 'Complete one chain-rule question and check the M1 step.')
  assert.equal(c.subtitle, 'Mathematics · Differentiation')
}
{
  const c = heroCopy({ kind: 'task', task: today.blocks[0]!, minutes: 12, shortened: true }, ctx)
  assert.equal(c.eyebrow, 'Up next · Past-paper question · 12 min · shortened to fit')
}
{
  // The day's total is the timeline header's, not the eyebrow's: the same words whatever today still holds.
  const c = heroCopy({ kind: 'task', task: today.blocks[0]!, minutes: 10, shortened: false, dayMinutes: 60 }, ctx)
  assert.equal(c.eyebrow, 'Up next · Past-paper question · 10 min')
  assert.ok(!/60/.test(c.eyebrow), 'the day total is not in the eyebrow')
  assert.ok(!/best use/i.test(c.eyebrow), 'no superlative')
  const diag = heroCopy({ kind: 'task', task: { ...today.blocks[0]!, taskType: 'diagnostic' }, minutes: 10, shortened: false }, ctx)
  assert.equal(diag.eyebrow, 'Up next · Quick diagnostic · 10 min')
}
{
  const c = heroCopy({ kind: 'done' }, ctx)
  assert.equal(c.title, "Today is done. You've studied on 2 of the last 3 days.")
  const first = heroCopy({ kind: 'done' }, { ...ctx, studiedLine: DAY_ONE_LINE })
  assert.equal(first.title, 'Today is done.', 'day one: the fact, not a judgement')
  assert.equal(first.note, 'Tomorrow starts with Open with the M1 step.', 'the tomorrow note stays on day one')
  assert.equal(c.note, 'Tomorrow starts with Open with the M1 step.')
}
{
  const c = heroCopy({ kind: 'no_time', nextDate: '2026-09-18' }, ctx)
  assert.equal(c.title, 'Nothing more today. Tomorrow starts with Open with the M1 step at 5 pm.')
  assert.equal(heroCopy({ kind: 'no_time', nextDate: null }, ctx).title, 'Nothing more today.')
  const later = heroCopy({ kind: 'no_time', nextDate: '2026-09-18' }, { ...ctx, todayIso: '2026-09-16' })
  assert.ok(!later.title.includes('Tomorrow'), 'a gap day is named, not called tomorrow')
  assert.ok(later.title.startsWith('Nothing more today. Fri 18 Sep'), 'named by its date')
}
{
  const rest = day('2026-09-19', [{ kind: 'rest', minutes: 0, label: 'Rest day.' }], 'rest')
  const c = heroCopy({ kind: 'rest' }, { ...ctx, day: rest })
  assert.equal(c.eyebrow, 'Rest day')
  assert.equal(c.title, 'Rest day.')
  const exam = day('2026-09-19', [{ kind: 'rest', minutes: 0, label: 'Exam today.' }], 'exam')
  assert.equal(heroCopy({ kind: 'rest' }, { ...ctx, day: exam }).eyebrow, 'Exam day')
}

assert.equal(firstTaskOn(plan, null), null)
assert.equal(firstTaskOn(plan, '2026-09-18')?.objective, 'Open with the M1 step.')

// Nothing the hero says may use the banned words.
for (const hero of [
  { kind: 'task', task: today.blocks[0]!, minutes: 25, shortened: true },
  { kind: 'done' },
  { kind: 'no_time', nextDate: null },
  { kind: 'rest' },
] as const) {
  const c = heroCopy(hero, ctx)
  const text = [c.eyebrow, c.title, c.subtitle, c.note, ...c.chips].join(' ').toLowerCase()
  for (const w of FORBIDDEN_NUDGE_WORDS) assert.ok(!text.includes(w), `hero copy must not say "${w}"`)
}

// --- countdown ---------------------------------------------------------------------

assert.equal(countdownLine(null), 'Exam roadmap')
assert.equal(countdownLine({ label: 'Mathematics', daysLeft: 19, component: 'Paper 1' }), '19 days to Mathematics Paper 1')
assert.equal(countdownLine({ label: 'Physics', daysLeft: 1 }), '1 day to Physics')
assert.equal(countdownLine({ label: 'Physics', daysLeft: 0 }), 'Physics is today')

// --- the clock in the plan's zone ---------------------------------------------------

{
  const at = new Date('2026-09-17T10:30:00Z')
  assert.equal(nowMinuteInZone('UTC', at), 630)
  assert.equal(nowMinuteInZone('Asia/Karachi', at), 15 * 60 + 30, 'UTC+5')
  assert.equal(nowMinuteInZone('Asia/Kolkata', at), 16 * 60, 'a half-hour zone carries its own minute')
  assert.equal(nowMinuteInZone('Asia/Kathmandu', at), 16 * 60 + 15, 'and a quarter-hour one')
  assert.equal(nowMinuteInZone('nowhere/nope', at), 630, 'an unknown zone reads as UTC')
  assert.equal(nowMinuteInZone('Pacific/Auckland', new Date('2026-09-17T11:30:00Z')), 23 * 60 + 30)
}

console.log('components/plan/roadmap/hero-copy.test.ts: ok')
