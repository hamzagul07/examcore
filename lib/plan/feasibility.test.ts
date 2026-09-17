import assert from 'node:assert/strict'
import {
  HEADLINE_BY_STATE,
  OPTIONS_BY_STATE,
  STRONG_LOOP_STUDY_DAYS,
  WEAK_LOOP_STUDY_DAYS,
  assessFeasibility,
  demandFor,
  isCalmCopy,
  loopFits,
  type AssessFeasibilityInput,
  type SubjectDemandInput,
} from '@/lib/plan/feasibility'
import { loopMinutes } from '@/lib/plan/modes'
import { FORBIDDEN_NUDGE_WORDS, type TopicPriority } from '@/lib/plan/roadmap-types'

const WEAK = loopMinutes('weak')
const STRONG = loopMinutes('strong')
assert.equal(WEAK, 70, 'diagnostic 10 + concept 20 + recall 10 + question 20 + review 10')
assert.equal(STRONG, 55, 'timed set 30 + error review 15 + recall 10')

function topic(code: string, band: TopicPriority['band'], loop: TopicPriority['loop'] = 'weak'): TopicPriority {
  return { code, name: `Topic ${code}`, score: 1, why: [], band, mastery: loop === 'weak' ? 0.3 : 0.8, uncertainty: 0, loop }
}

function subject(over: Partial<SubjectDemandInput> = {}): SubjectDemandInput {
  return {
    code: '9709',
    label: 'Mathematics',
    daysToPaper: 30,
    studyDaysToPaper: 20,
    pool: [topic('a', 'must'), topic('b', 'must'), topic('c', 'should'), topic('d', 'could', 'strong')],
    inTaper: false,
    ...over,
  }
}

type Sub = AssessFeasibilityInput['subjects'][number]
function planned(s: SubjectDemandInput, over: Partial<Pick<Sub, 'plannedTopics' | 'plannedMinutes' | 'later' | 'started'>> = {}): Sub {
  return { ...s, plannedTopics: s.pool.length, plannedMinutes: 0, later: [], ...over }
}

function assess(over: Partial<AssessFeasibilityInput> = {}) {
  return assessFeasibility({
    mode: 'balanced',
    sessionLength: 40,
    supplyMinutes: 1000,
    plannedMinutes: 900,
    capacityMinutes: 1250,
    laidMinutes: 1000,
    subjects: [planned(subject())],
    ...over,
  })
}

// --- loops -------------------------------------------------------------------------------------

assert.equal(WEAK_LOOP_STUDY_DAYS, 3)
assert.equal(STRONG_LOOP_STUDY_DAYS, 2)
assert.equal(loopFits('weak', 3), true)
assert.equal(loopFits('weak', 2), false)
assert.equal(loopFits('strong', 2), true)
assert.equal(loopFits('strong', 1), false)

// --- demand --------------------------------------------------------------------------------------

{
  // Plenty of days: every loop is admitted; must counts the must band only.
  const d = demandFor(subject(), 'balanced')
  assert.deepEqual(d, { must: 2 * WEAK, full: 3 * WEAK + STRONG, admittedMust: 2 * WEAK, admittedFull: 3 * WEAK + STRONG, admittedMustTopics: 2 })
}

{
  // Demand grows with the pool.
  const small = demandFor(subject({ pool: [topic('a', 'must')] }), 'balanced')
  const large = demandFor(subject({ pool: [topic('a', 'must'), topic('b', 'must'), topic('c', 'must')] }), 'balanced')
  assert.ok(large.must > small.must && large.full > small.full && large.admittedFull > small.admittedFull)
}

{
  // In the taper, or with two study days or fewer, a subject demands nothing.
  const nothing = { must: 0, full: 0, admittedMust: 0, admittedFull: 0, admittedMustTopics: 0 }
  assert.deepEqual(demandFor(subject({ inTaper: true }), 'balanced'), nothing)
  assert.deepEqual(demandFor(subject({ studyDaysToPaper: 2 }), 'balanced'), nothing)
  assert.deepEqual(demandFor(subject({ studyDaysToPaper: 1 }), 'polish'), nothing)
}

{
  // Admission caps at what the days before the taper can hold, one loop at a time, never fewer than one when one fits.
  const five = demandFor(subject({ studyDaysToPaper: 5 }), 'balanced') // 3 study days to taper: one weak loop
  assert.equal(five.admittedMust, WEAK)
  assert.equal(five.admittedMustTopics, 1, 'one must-cover loop is reachable')
  assert.equal(five.admittedFull, WEAK, 'the strong loop needs two more days and does not fit')
  assert.equal(five.must, 2 * WEAK, 'raw demand is unchanged')
  const eight = demandFor(subject({ studyDaysToPaper: 8 }), 'balanced') // 6 days: two weak loops
  assert.equal(eight.admittedMust, 2 * WEAK)
  assert.equal(eight.admittedFull, 2 * WEAK, 'a third weak loop does not fit; the strong one after it does not either')
  const ten = demandFor(subject({ studyDaysToPaper: 10 }), 'balanced') // 8 days: two weak (6) + strong (2)
  assert.equal(ten.admittedFull, 2 * WEAK + STRONG)
  const four = demandFor(subject({ studyDaysToPaper: 4, pool: [topic('a', 'must'), topic('b', 'must', 'strong')] }), 'balanced') // 2 days: only the strong loop
  assert.equal(four.admittedMust, STRONG, 'a strong loop that fits is admitted past a weak one that does not')
}

// --- state thresholds -------------------------------------------------------------------------------

{
  const full = 3 * WEAK + STRONG
  const must = 2 * WEAK
  assert.equal(assess({ supplyMinutes: full }).state, 'on_track', 'supply equal to full demand is on track')
  assert.equal(assess({ supplyMinutes: full - 1 }).state, 'focused')
  assert.equal(assess({ supplyMinutes: must }).state, 'focused', 'supply equal to must demand is focused')
  assert.equal(assess({ supplyMinutes: must - 1 }).state, 'tight')
  assert.equal(assess({ supplyMinutes: 0 }).state, 'tight')
  const r = assess({ supplyMinutes: must })
  assert.equal(r.demandMustMinutes, must)
  assert.equal(r.demandFullMinutes, full)
  assert.ok(Math.abs(r.ratios.must - 1) < 1e-9)
  assert.ok(Math.abs(r.ratios.full - must / full) < 1e-9)
  assert.ok(Math.abs(r.utilisation - 0.8) < 1e-9)
}

{
  // A one-day plan is never tight: the subject is review-only, so the state is on_track or focused.
  const eve = assess({ supplyMinutes: 0, subjects: [planned(subject({ daysToPaper: 1, studyDaysToPaper: 1 }))] })
  assert.notEqual(eve.state, 'tight')
  assert.equal(eve.state, 'on_track')
  const taper = assess({ supplyMinutes: 0, subjects: [planned(subject({ inTaper: true })), planned(subject({ code: '9702', studyDaysToPaper: 2 }))] })
  assert.notEqual(taper.state, 'tight')
  const none = assess({ supplyMinutes: 0, subjects: [] })
  assert.equal(none.state, 'on_track')
  assert.equal(none.ratios.must, 0)
}

{
  // Two subjects: demand sums, one in its taper contributes nothing.
  const r = assess({ supplyMinutes: 10, subjects: [planned(subject()), planned(subject({ code: '9702', label: 'Physics', inTaper: true }))] })
  assert.equal(r.demandMustMinutes, 2 * WEAK)
  assert.equal(r.state, 'tight')
  assert.equal(r.subjects.length, 2)
  assert.deepEqual(r.subjects[1], { code: '9702', label: 'Physics', daysToPaper: 30, mustTopics: 2, plannedTopics: 4, mustReachable: 0, started: [], later: [], minutes: 0, reviewOnly: true })
  assert.deepEqual(r.subjects[0]!.mustReachable, 2)
  assert.equal(r.subjects[0]!.reviewOnly, false)
}

// --- options and headlines ----------------------------------------------------------------------------

assert.deepEqual(OPTIONS_BY_STATE.on_track, ['keep'])
assert.deepEqual(OPTIONS_BY_STATE.focused, ['keep', 'add_time', 'change_mode'])
assert.deepEqual(OPTIONS_BY_STATE.tight, ['keep', 'add_time', 'prioritise_subject', 'change_mode'])
assert.deepEqual(assess({ supplyMinutes: 5000 }).options, ['keep'])
assert.deepEqual(assess({ supplyMinutes: 2 * WEAK }).options, ['keep', 'add_time', 'change_mode'])
assert.deepEqual(assess({ supplyMinutes: 1 }).options, ['keep', 'add_time', 'prioritise_subject', 'change_mode'])
assert.equal(assess({ supplyMinutes: 5000 }).headline, 'Your plan fits the time you have.')
assert.equal(assess({ supplyMinutes: 2 * WEAK }).headline, 'A focused plan: the must-cover topics fit, and the rest waits.')
assert.equal(assess({ supplyMinutes: 1 }).headline, HEADLINE_BY_STATE.tight)

// --- tradeoffs -------------------------------------------------------------------------------------------

{
  assert.deepEqual(assess({ supplyMinutes: 5000 }).tradeoffs, [], 'nothing to say when everything fits')
  const short = assess({ supplyMinutes: 5000, sessionLength: 20 })
  assert.equal(
    short.tradeoffs[0],
    "20-minute sessions give you about 5000 focused minutes of your 1250 — no timed papers or sets, questions one at a time. That's the cost of short blocks, and it's fine."
  )

  const later = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { later: ['Vectors', 'Series', 'Integration', 'Complex numbers', 'Proof'] })] })
  assert.deepEqual(later.tradeoffs, ['Mathematics: 5 topics left for later — Vectors, Series, Integration, +2 more.'])
  const one = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { later: ['Vectors'] })] })
  assert.deepEqual(one.tradeoffs, ['Mathematics: 1 topic left for later — Vectors.'])
  // A subject in its taper has nothing "left for later": nothing new was due, and its row says review only.
  const eve = assess({ supplyMinutes: 5000, subjects: [planned(subject({ daysToPaper: 1, studyDaysToPaper: 1 }), { plannedTopics: 0, later: ['Vectors', 'Series'] })] })
  assert.deepEqual(eve.tradeoffs, [])
  assert.equal(eve.subjects[0]!.reviewOnly, true)
  assert.equal(eve.state, 'on_track')

  // Reached counts the marked question, not the first step: a plan that opened topics but proved fewer than the calendar
  // could hold is focused, and says which topics are started but not proved.
  const stalled = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 1, started: ['Topic b', 'Topic c'] })] })
  assert.equal(stalled.state, 'focused')
  assert.deepEqual(stalled.tradeoffs, ['Mathematics: 2 topics are opened but their marked question is not on the calendar yet — Topic b, Topic c.'])
  assert.equal(stalled.subjects[0]!.mustReachable, 2)
  const reached = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 2, started: ['Topic c'] })] })
  assert.equal(reached.state, 'on_track', 'every reachable must-cover topic is proved')
  // The report carries the arithmetic behind "in hand".
  const r = assess({ supplyMinutes: 5000, studyDays: 12 })
  assert.deepEqual([r.capacityMinutes, r.laidMinutes, r.studyDays], [1250, 1000, 12])

  const tight = assess({ supplyMinutes: 1 })
  assert.equal(tight.tradeoffs[0], 'Not everything fits. The plan protects the must-cover topics and keeps breaks real.')

  const slack = assess({ supplyMinutes: 5000, laidMinutes: 900 })
  assert.deepEqual(slack.tradeoffs, ["Some of your time stays in hand on purpose — for days that don't go to plan."])
  assert.equal(assess({ supplyMinutes: 5000, laidMinutes: 938 }).tradeoffs.length, 0, '0.7504 is not under UTILISATION_MIN')

  // At most four, the tight line first.
  const many = assess({
    supplyMinutes: 1,
    sessionLength: 20,
    laidMinutes: 100,
    subjects: [
      planned(subject(), { later: ['a'] }),
      planned(subject({ code: '2', label: 'Physics' }), { later: ['b'] }),
      planned(subject({ code: '3', label: 'Chemistry' }), { later: ['c'] }),
    ],
  })
  assert.equal(many.tradeoffs.length, 4)
  assert.ok(many.tradeoffs[0]!.startsWith('Not everything fits'))
}

// --- copy is calm ------------------------------------------------------------------------------------------

{
  const reports = [
    assess({ supplyMinutes: 5000 }),
    assess({ supplyMinutes: 2 * WEAK }),
    assess({ supplyMinutes: 1, sessionLength: 20, laidMinutes: 100, subjects: [planned(subject(), { later: ['Vectors', 'Series', 'Integration', 'Proof'] })] }),
  ]
  for (const r of reports) {
    for (const line of [r.headline, ...r.tradeoffs]) {
      assert.ok(isCalmCopy(line), `calm: ${line}`)
      const lower = line.toLowerCase()
      for (const banned of FORBIDDEN_NUDGE_WORDS) assert.ok(!lower.includes(banned), `no "${banned}" in: ${line}`)
      assert.ok(!line.includes('!'), 'no exclamation marks')
    }
  }
  for (const h of Object.values(HEADLINE_BY_STATE)) assert.ok(isCalmCopy(h))
  assert.equal(isCalmCopy("You're behind"), false)
  assert.equal(isCalmCopy('Keep it up'), true)
}

console.log('feasibility.test.ts: ok')
