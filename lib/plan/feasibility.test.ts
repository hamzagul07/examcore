import assert from 'node:assert/strict'
import {
  HEADLINE_BY_STATE,
  OPTIONS_BY_STATE,
  STRONG_LOOP_STUDY_DAYS,
  WEAK_LOOP_STUDY_DAYS,
  assessFeasibility,
  bufferMinutesPerDay,
  demandFor,
  headlineFor,
  isCalmCopy,
  loopFits,
  type AssessFeasibilityInput,
  type SubjectDemandInput,
} from '@/lib/plan/feasibility'
import { loopMinutes } from '@/lib/plan/modes'
import { FORBIDDEN_NUDGE_WORDS, type FeasibilityReport, type TopicPriority } from '@/lib/plan/roadmap-types'

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

const FULL = 3 * WEAK + STRONG
const MUST = 2 * WEAK

/** Every line a student could read from a report. */
function studentLines(r: FeasibilityReport): string[] {
  return [r.headline, ...r.tradeoffs]
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
  assert.deepEqual(d, { must: MUST, full: FULL, admittedMust: MUST, admittedFull: FULL, admittedMustTopics: 2 })
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
  assert.equal(five.admittedMustTopics, 1, 'one priority loop is reachable')
  assert.equal(five.admittedFull, WEAK, 'the strong loop needs two more days and does not fit')
  assert.equal(five.must, MUST, 'raw demand is unchanged')
  assert.equal(five.full, FULL, 'full demand is the whole pool whatever the days hold')
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
  assert.equal(assess({ supplyMinutes: FULL }).state, 'on_track', 'supply equal to full demand, everything on the calendar, is on track')
  assert.equal(assess({ supplyMinutes: FULL - 1 }).state, 'focused')
  assert.equal(assess({ supplyMinutes: MUST }).state, 'focused', 'supply equal to must demand is focused')
  assert.equal(assess({ supplyMinutes: MUST - 1 }).state, 'tight')
  assert.equal(assess({ supplyMinutes: 0 }).state, 'tight')
  const r = assess({ supplyMinutes: MUST })
  assert.equal(r.demandMustMinutes, MUST)
  assert.equal(r.demandFullMinutes, FULL)
  assert.ok(Math.abs(r.ratios.must - 1) < 1e-9)
  assert.ok(Math.abs(r.ratios.full - MUST / FULL) < 1e-9)
  assert.ok(Math.abs(r.utilisation - 0.8) < 1e-9)
}

{
  // Full demand is the whole pool, not what sequential admission could fit: a short window with a long pool is never
  // "on track" because the calendar happened to hold the one loop it could admit.
  const short = planned(subject({ studyDaysToPaper: 5 }), { plannedTopics: 1, later: ['Topic b', 'Topic c', 'Topic d'] })
  const r = assess({ supplyMinutes: 5000, subjects: [short] })
  assert.equal(r.demandFullMinutes, FULL)
  assert.equal(r.demandMustMinutes, WEAK, 'must demand is still the admitted loops')
  assert.equal(r.state, 'focused')
}

{
  // A subject with topics left for later is never on track, however much time there is.
  for (const supply of [FULL, 5000, 100_000]) {
    const r = assess({ supplyMinutes: supply, subjects: [planned(subject(), { plannedTopics: 3, later: ['Topic d'] })] })
    assert.equal(r.state, 'focused', `later.length > 0 at supply ${supply}`)
  }
  // Nor is one with more priority topics than the days before its taper can reach.
  const cut = assess({ supplyMinutes: 5000, subjects: [planned(subject({ studyDaysToPaper: 5 }), { plannedTopics: 1 })] })
  assert.equal(cut.subjects[0]!.mustTopics, 2)
  assert.equal(cut.subjects[0]!.mustReachable, 1)
  assert.equal(cut.state, 'focused', 'mustTopics > mustReachable is never on_track')
  // Nor one whose opened topics have no marked question on the calendar.
  const started = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 3, started: ['Topic d'] })] })
  assert.equal(started.state, 'focused')
  // Nor one that proved fewer topics than the priority loops the days could hold.
  const stalled = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 1 })] })
  assert.equal(stalled.state, 'focused')
  assert.equal(stalled.subjects[0]!.mustReachable, 2)
  // Everything proved, nothing waiting: on track.
  const all = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 4, started: [], later: [] })] })
  assert.equal(all.state, 'on_track')
}

{
  // mustReachable never sits below what the plan proved: the scheduler may interleave loops that sequential admission
  // could not, and a row must not read "1 of 1" while three are on the calendar.
  const r = assess({ supplyMinutes: 5000, subjects: [planned(subject({ studyDaysToPaper: 5 }), { plannedTopics: 3, later: ['Topic d'] })] })
  assert.equal(r.subjects[0]!.mustReachable, 3)
  assert.equal(r.state, 'focused', 'Topic d still waits')
  const every = assess({ supplyMinutes: 5000, subjects: [planned(subject({ studyDaysToPaper: 5 }), { plannedTopics: 4 })] })
  assert.equal(every.subjects[0]!.mustReachable, 4)
  assert.equal(every.state, 'on_track', 'every loop landed, so the admission estimate does not downgrade it')
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
  // A subject in its taper has nothing waiting: nothing new was ever due, and its row says review only.
  const late = assess({ supplyMinutes: 5000, subjects: [planned(subject({ daysToPaper: 1, studyDaysToPaper: 1 }), { plannedTopics: 0, later: ['Vectors', 'Series'] })] })
  assert.equal(late.subjects[0]!.reviewOnly, true)
  assert.equal(late.state, 'on_track')
}

{
  // Two subjects: demand sums, one in its taper contributes nothing.
  const r = assess({ supplyMinutes: 10, subjects: [planned(subject()), planned(subject({ code: '9702', label: 'Physics', inTaper: true }))] })
  assert.equal(r.demandMustMinutes, MUST)
  assert.equal(r.state, 'tight')
  assert.equal(r.subjects.length, 2)
  assert.deepEqual(r.subjects[1], { code: '9702', label: 'Physics', daysToPaper: 30, mustTopics: 2, plannedTopics: 4, mustReachable: 0, started: [], later: [], minutes: 0, reviewOnly: true })
  const ok = assess({ supplyMinutes: 5000, subjects: [planned(subject()), planned(subject({ code: '9702', label: 'Physics' }), { plannedTopics: 2, later: ['Waves'] })] })
  assert.equal(ok.state, 'focused', 'one subject waiting is enough')
}

// --- options and headline ----------------------------------------------------------------------------

assert.deepEqual(OPTIONS_BY_STATE.on_track, ['keep'])
assert.deepEqual(OPTIONS_BY_STATE.focused, ['keep', 'add_time', 'change_mode'])
assert.deepEqual(OPTIONS_BY_STATE.tight, ['keep', 'add_time', 'prioritise_subject', 'change_mode'])
assert.deepEqual(assess({ supplyMinutes: 5000 }).options, ['keep'])
assert.deepEqual(assess({ supplyMinutes: MUST }).options, ['keep', 'add_time', 'change_mode'])
assert.deepEqual(assess({ supplyMinutes: 1 }).options, ['keep', 'add_time', 'prioritise_subject', 'change_mode'])

assert.equal(HEADLINE_BY_STATE.on_track, 'Everything this style asks for fits before your papers.')
assert.equal(HEADLINE_BY_STATE.focused, 'What fits before each paper is in. The rest waits — the rows below say which.')
assert.equal(HEADLINE_BY_STATE.tight, 'Time is tight. The plan keeps the topics that matter most and real breaks; it does not pretend you can do everything.')
assert.equal(assess({ supplyMinutes: 5000 }).headline, HEADLINE_BY_STATE.on_track)
assert.equal(assess({ supplyMinutes: MUST }).headline, HEADLINE_BY_STATE.focused)
assert.equal(assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 3, later: ['Topic d'] })] }).headline, HEADLINE_BY_STATE.focused)
assert.equal(assess({ supplyMinutes: 1 }).headline, HEADLINE_BY_STATE.tight)
for (const r of [assess({ supplyMinutes: 5000 }), assess({ supplyMinutes: MUST }), assess({ supplyMinutes: 1 })]) {
  assert.equal(headlineFor(r), r.headline, 'the headline is a function of the report')
}
assert.equal(headlineFor({ state: 'tight' }), HEADLINE_BY_STATE.tight)

// --- tradeoffs -------------------------------------------------------------------------------------------

{
  assert.deepEqual(assess({ supplyMinutes: 5000 }).tradeoffs, [], 'nothing to say when everything fits')
  const short = assess({ supplyMinutes: 5000, sessionLength: 20 })
  assert.equal(
    short.tradeoffs[0],
    "20-minute sessions give you about 5000 focused minutes of your 1250 — no timed papers or sets, questions one at a time. That's the cost of short blocks, and it's fine."
  )

  // The rows own the per-subject facts: nothing "left for later" or "started" is repeated as a tradeoff.
  const later = assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 1, later: ['Vectors', 'Series', 'Integration'], started: ['Proof'] })] })
  assert.equal(later.state, 'focused')
  assert.deepEqual(later.tradeoffs, [])
  assert.deepEqual(later.subjects[0]!.later, ['Vectors', 'Series', 'Integration'])
  assert.deepEqual(later.subjects[0]!.started, ['Proof'])

  // The report carries the arithmetic behind the buffer line.
  const r = assess({ supplyMinutes: 5000, studyDays: 12 })
  assert.deepEqual([r.capacityMinutes, r.laidMinutes, r.studyDays], [1250, 1000, 12])

  const tight = assess({ supplyMinutes: 1 })
  assert.equal(tight.tradeoffs[0], 'Not everything fits. The plan protects the priority topics and keeps breaks real.')

  // One buffer line, with the number: (capacity − laid) / study days, to the nearest five.
  const slack = assess({ supplyMinutes: 5000, laidMinutes: 900, studyDays: 12 })
  assert.deepEqual(slack.tradeoffs, ["About 30 min a day is left free on purpose — for days that don't go to plan."])
  const noDays = assess({ supplyMinutes: 5000, laidMinutes: 900 })
  assert.deepEqual(noDays.tradeoffs, ["About 10 min a day is left free on purpose — for days that don't go to plan."], 'days to the paper stand in for the count')
  const tiny = assess({ supplyMinutes: 5000, laidMinutes: 900, studyDays: 400 })
  assert.deepEqual(tiny.tradeoffs, ["Some of your time is left free on purpose — for days that don't go to plan."], 'under 2.5 min a day rounds to nothing, so no number is claimed')
  assert.equal(assess({ supplyMinutes: 5000, laidMinutes: 938 }).tradeoffs.length, 0, '0.7504 is not under UTILISATION_MIN')

  assert.equal(bufferMinutesPerDay({ capacityMinutes: 1250, laidMinutes: 900, studyDays: 12, subjects: [] }), 30)
  assert.equal(bufferMinutesPerDay({ capacityMinutes: 1250, laidMinutes: 900, studyDays: 0, subjects: [] }), 0)
  assert.equal(bufferMinutesPerDay({ capacityMinutes: 1250, laidMinutes: 900, subjects: [planned(subject())] }), 10)
  assert.equal(bufferMinutesPerDay({ capacityMinutes: 100, laidMinutes: 200, studyDays: 2, subjects: [] }), 0, 'never negative')

  // At most three lines can be produced here, the tight line first; the cap leaves room for the scheduler's own.
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
  assert.equal(many.tradeoffs.length, 3)
  assert.ok(many.tradeoffs[0]!.startsWith('Not everything fits'))
  assert.ok(many.tradeoffs[1]!.startsWith('20-minute sessions'))
  assert.ok(many.tradeoffs[2]!.includes('left free on purpose'))
}

// --- copy is calm ------------------------------------------------------------------------------------------

{
  const reports = [
    assess({ supplyMinutes: 5000 }),
    assess({ supplyMinutes: MUST }),
    assess({ supplyMinutes: 5000, subjects: [planned(subject(), { plannedTopics: 1, later: ['Vectors'], started: ['Proof'] })] }),
    assess({ supplyMinutes: 5000, laidMinutes: 900, studyDays: 12 }),
    assess({ supplyMinutes: 5000, laidMinutes: 900, studyDays: 400 }),
    assess({ supplyMinutes: 1, sessionLength: 20, laidMinutes: 100, subjects: [planned(subject(), { later: ['Vectors', 'Series', 'Integration', 'Proof'] })] }),
  ]
  const lines = [...Object.values(HEADLINE_BY_STATE), ...reports.flatMap(studentLines)]
  assert.ok(lines.length >= 8)
  for (const line of lines) {
    assert.ok(isCalmCopy(line), `calm: ${line}`)
    const lower = line.toLowerCase()
    for (const banned of FORBIDDEN_NUDGE_WORDS) assert.ok(!lower.includes(banned), `no "${banned}" in: ${line}`)
    assert.ok(!line.includes('!'), `no exclamation marks: ${line}`)
    assert.ok(!lower.includes('must-cover'), `the engine word stays out of student copy: ${line}`)
    assert.ok(!lower.includes('verified'), `no "verified": ${line}`)
    assert.ok(!/\b(will|won't|guarantee|pass|grade)\b/.test(lower), `no predictions: ${line}`)
  }
  assert.equal(isCalmCopy("You're behind"), false)
  assert.equal(isCalmCopy('Keep it up'), true)
}

console.log('feasibility.test.ts: ok')
