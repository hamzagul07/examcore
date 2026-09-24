import assert from 'node:assert/strict'
import { MODE_WEIGHTS, URGENCY_FLOOR, WEAK_BELOW_PCT } from '@/lib/plan/modes'
import {
  STRONG_LOOP_DAYS_NEEDED,
  WEAK_LOOP_DAYS_NEEDED,
  eligibleTopics,
  loopFor,
  masteryEstimate,
  rankSubjectTopics,
  scoreTopic,
  syllabusOnlyWhy,
  type ScoreContext,
} from '@/lib/plan/priority'
import {
  EVIDENCE_EXPLANATION_MAX,
  FORBIDDEN_NUDGE_WORDS,
  SELF_RATING_PRIOR,
  type EvidenceItem,
  type RoadmapMode,
  type SelfRating,
  type TopicPriority,
  type TopicSignals,
} from '@/lib/plan/roadmap-types'

const MODES: RoadmapMode[] = ['foundation', 'balanced', 'polish']
const RATINGS: Array<SelfRating | undefined> = [undefined, 'not_started', 'rusty', 'confident']

const NONE = new Set<string>()

function signal(over: Partial<TopicSignals> = {}): TopicSignals {
  return { code: '1.5', name: 'Trigonometry', order: 4, coreWeight: 1, paper: 'P1', ...over }
}

function ctx(over: Partial<ScoreContext> = {}): ScoreContext {
  return {
    mode: 'balanced',
    daysToPaper: 20,
    planLength: 20,
    studyDaysToPaper: 14,
    subjectLabel: 'Mathematics',
    board: 'Cambridge',
    component: 'Paper 1',
    examDate: '2026-10-07',
    todayIso: '2026-09-17',
    ...over,
  }
}

const allWhy: EvidenceItem[][] = []
function score(s: TopicSignals, prior = 0.5, rating?: Parameters<typeof scoreTopic>[2], c = ctx(), scheduled = NONE, nameOf?: (code: string) => string | undefined) {
  const t = scoreTopic(s, prior, rating, c, scheduled, nameOf)
  allWhy.push(t.why)
  return t
}
const types = (t: TopicPriority) => t.why.map((w) => w.type)

// --- mastery ---------------------------------------------------------------------------------

assert.deepEqual(masteryEstimate(signal(), 0.35), { mastery: 0.35, uncertainty: 1 }, 'no marks: the prior, fully unsure')
assert.deepEqual(masteryEstimate(signal({ mastery: { percentage: 90, attempts: 0 } }), 0.35), { mastery: 0.35, uncertainty: 1 })
{
  // Blending: one answer at 100% with a rusty prior → (1 × 1 + 0.35 × 3) / 4.
  const one = masteryEstimate(signal({ mastery: { percentage: 100, attempts: 1 } }), 0.35)
  assert.ok(Math.abs(one.mastery - 0.5125) < 1e-9)
  assert.ok(Math.abs(one.uncertainty - 2 / 3) < 1e-9)
  const two = masteryEstimate(signal({ mastery: { percentage: 40, attempts: 2 } }), 0.8)
  assert.ok(Math.abs(two.mastery - (0.8 + 2.4) / 5) < 1e-9)
  assert.ok(Math.abs(two.uncertainty - 1 / 3) < 1e-9)
}
assert.deepEqual(masteryEstimate(signal({ mastery: { percentage: 30, attempts: 3 } }), 0.8), { mastery: 0.3, uncertainty: 0 }, 'enough marks: the marks win')
assert.deepEqual(masteryEstimate(signal({ mastery: { percentage: 72, attempts: 11 } }), 0.15), { mastery: 0.72, uncertainty: 0 })

assert.equal(loopFor(0.64), 'weak')
assert.equal(loopFor(0.65), 'strong')
assert.equal(loopFor(WEAK_BELOW_PCT / 100 - 0.001), 'weak')

// --- the three weak-area cases ------------------------------------------------------------------

{
  const fresh = score(signal())
  assert.ok(!types(fresh).includes('weak_area'), '0 attempts is never a weak area')
  assert.ok(!types(fresh).includes('recent_practice'))

  const two = score(signal({ mastery: { percentage: 20, attempts: 2 } }))
  assert.ok(types(two).includes('recent_practice'), '2 attempts → recent practice')
  assert.ok(!types(two).includes('weak_area'))
  const rp = two.why.find((w) => w.type === 'recent_practice')!
  assert.equal(rp.confidence, 'low')
  assert.equal(rp.source, 'user_performance')
  assert.equal(rp.explanation, "You've marked 2 answers here at 20% — too few to call it a weak area yet; this one confirms where it stands.")
  const one = score(signal({ mastery: { percentage: 50, attempts: 1 } }))
  assert.ok(one.why.find((w) => w.type === 'recent_practice')!.explanation.startsWith("You've marked 1 answer here"))

  const three = score(signal({ mastery: { percentage: 30, attempts: 3 } }))
  const wa = three.why.find((w) => w.type === 'weak_area')!
  assert.ok(wa, '3 attempts at 30% → weak area')
  assert.equal(wa.confidence, 'high', 'below CRITICAL_BELOW_PCT is high confidence')
  assert.equal(wa.explanation, "You're at 30% across 3 marked answers here.")
  assert.equal(three.loop, 'weak')

  const medium = score(signal({ mastery: { percentage: 55, attempts: 4 } }))
  assert.equal(medium.why.find((w) => w.type === 'weak_area')!.confidence, 'medium')
  const strong = score(signal({ mastery: { percentage: 80, attempts: 5 } }))
  assert.ok(!types(strong).includes('weak_area'), 'above the threshold is not weak')
  assert.equal(strong.loop, 'strong')
  assert.equal(strong.uncertainty, 0)
}

// --- urgency, improvement -------------------------------------------------------------------------

{
  // Urgency floors at 0.5 for a far paper: the same topic scores exactly half of its planLength-days-out score.
  const near = score(signal(), 0.5, undefined, ctx({ daysToPaper: 20, planLength: 20 }))
  const far = score(signal(), 0.5, undefined, ctx({ daysToPaper: 400, planLength: 20 }))
  assert.ok(near.score > 0)
  assert.ok(Math.abs(far.score / near.score - URGENCY_FLOOR) < 1e-9)
  const today = score(signal(), 0.5, undefined, ctx({ daysToPaper: 0, planLength: 20 }))
  assert.ok(Math.abs(today.score / near.score - (1 + MODE_WEIGHTS.balanced.urgency)) < 1e-9, 'a paper today doubles it')
}

{
  // Improvement: a fresh topic with one study day left is a quarter of one with the loop's days; none with zero.
  assert.equal(WEAK_LOOP_DAYS_NEEDED, 4)
  assert.equal(STRONG_LOOP_DAYS_NEEDED, 2)
  const room = score(signal(), 0.15, 'not_started', ctx({ studyDaysToPaper: 4 }))
  const one = score(signal(), 0.15, 'not_started', ctx({ studyDaysToPaper: 1 }))
  const none = score(signal(), 0.15, 'not_started', ctx({ studyDaysToPaper: 0 }))
  assert.ok(room.score > 0)
  assert.ok(Math.abs(one.score / room.score - 1 / WEAK_LOOP_DAYS_NEEDED) < 1e-9)
  assert.equal(none.score, 0, 'nothing to gain from a topic that cannot be learned in time')
  // A strong topic needs fewer days.
  const strongRoom = score(signal(), 0.8, 'confident', ctx({ studyDaysToPaper: 2 }))
  const strongMore = score(signal(), 0.8, 'confident', ctx({ studyDaysToPaper: 6 }))
  assert.ok(Math.abs(strongRoom.score - strongMore.score) < 1e-9, 'two study days is already enough for a strong loop')
}

{
  // Mastery makes the product term shrink; a mastered topic with nothing else scores 0.
  const done = score(signal({ mastery: { percentage: 100, attempts: 5 } }))
  assert.equal(done.score, 0)
  const review = score(signal({ mastery: { percentage: 100, attempts: 5 }, reviewDueAt: '2026-09-17' }))
  assert.ok(review.score > 0, 'a review due still scores')
  assert.ok(types(review).includes('review_due'))
}

// --- evidence rules --------------------------------------------------------------------------------

{
  // Frequency is never emitted without signal.frequency, and always with a stat when it is.
  const plain = score(signal())
  assert.ok(!types(plain).includes('frequency'))
  const f = score(signal({ frequency: { papers: 9, of: 9, from: 'May/June 2024', to: 'Oct/Nov 2025', taggedShare: 0.8, scope: 'component' } }))
  const item = f.why.find((w) => w.type === 'frequency')!
  assert.deepEqual(item.stat, { n: 9, of: 9, from: 'May/June 2024', to: 'Oct/Nov 2025' })
  assert.equal(item.source, 'indexed_papers')
  assert.equal(item.confidence, 'medium')
  assert.equal(
    item.explanation,
    'Set in 9 of the 9 Mathematics Paper 1 sittings MarkScheme has indexed (May/June 2024–Oct/Nov 2025) (not every question is tagged yet)'
  )
  const full = score(signal({ frequency: { papers: 6, of: 8, taggedShare: 1, scope: 'subject' } }))
  assert.equal(full.why.find((w) => w.type === 'frequency')!.explanation, 'Set in 6 of the 8 Mathematics sittings MarkScheme has indexed')
  assert.ok(f.score > plain.score, 'evidence raises the score')
  assert.ok(!item.explanation.toLowerCase().includes('verified'))
}

{
  // on_syllabus: board, subject, paper phrase; never core_syllabus.
  const t = score(signal({ paper: 'P1/P2' }))
  assert.equal(t.why[0]!.type, 'on_syllabus')
  assert.equal(t.why[0]!.explanation, 'On the Cambridge Mathematics syllabus for Papers 1 and 2')
  assert.equal(t.why[0]!.confidence, 'high')
  assert.equal(score(signal({ paper: undefined }), 0.5, undefined, ctx({ board: undefined })).why[0]!.explanation, 'On the Mathematics syllabus')
  assert.equal(score(signal({ paper: 'Essay' })).why[0]!.explanation, 'On the Cambridge Mathematics syllabus for Essay')
}

{
  // An IB-shaped signal (no frequency, no parent): only on_syllabus, plus self_rated when rated.
  const ib = signal({ code: 'SL1.2', paper: 'Paper 1', parentCode: undefined, frequency: undefined })
  const c = ctx({ board: 'IB', subjectLabel: 'Mathematics AA', component: undefined })
  assert.deepEqual(types(score(ib, 0.5, undefined, c)), ['on_syllabus'])
  const rated = score(ib, SELF_RATING_PRIOR.rusty, 'rusty', c)
  assert.deepEqual(types(rated), ['on_syllabus', 'self_rated'])
  const sr = rated.why[1]!
  assert.equal(sr.source, 'self_report')
  assert.equal(sr.confidence, 'low')
  assert.equal(sr.explanation, 'You rated Mathematics AA "Rusty". We\'ll go with that until your marked answers say otherwise.')
  assert.ok(!types(score(signal({ mastery: { percentage: 50, attempts: 3 } }), 0.35, 'rusty')).includes('self_rated'), 'marks outrank the rating')
}

{
  // A 'confident' subject with 0 attempts: loop strong, uncertainty 1 — the scheduler still diagnoses first.
  const t = score(signal(), SELF_RATING_PRIOR.confident, 'confident')
  assert.equal(t.loop, 'strong')
  assert.equal(t.uncertainty, 1)
  assert.equal(t.mastery, 0.8)
}

{
  // Prerequisite: only with a real parent and a scheduled later code; names the later topic.
  const nameOf = (c: string) => ({ '1.6': 'Series' } as Record<string, string>)[c]
  const pre = signal({ parentCode: '1', prerequisiteOf: ['1.6', '1.7'] })
  const without = score(pre, 0.5, undefined, ctx(), new Set(['9.9']), nameOf)
  assert.ok(!types(without).includes('prerequisite'))
  const withIt = score(pre, 0.5, undefined, ctx(), new Set(['1.6']), nameOf)
  const item = withIt.why.find((w) => w.type === 'prerequisite')!
  assert.equal(item.explanation, "Listed before Series in the syllabus, so it's worth doing first")
  assert.equal(item.confidence, 'low')
  assert.ok(withIt.score > without.score)
  const noParent = score(signal({ prerequisiteOf: ['1.6'] }), 0.5, undefined, ctx(), new Set(['1.6']), nameOf)
  assert.ok(!types(noParent).includes('prerequisite'), 'IB leaves have no parent and get no prerequisite claim')
  assert.equal(noParent.score, without.score)
}

{
  // review_due and nearest_paper copy.
  const r = score(signal({ reviewDueAt: '2026-09-15', mastery: { percentage: 70, attempts: 4, lastAt: '2026-09-10T10:00:00Z' } }))
  assert.equal(r.why.find((w) => w.type === 'review_due')!.explanation, 'Due for review — you worked on this 7 days ago.')
  const notYet = score(signal({ reviewDueAt: '2026-09-18' }))
  assert.ok(!types(notYet).includes('review_due'))
  const np = score(signal({ onNearestPaper: true }))
  const item = np.why.find((w) => w.type === 'nearest_paper')!
  assert.equal(item.explanation, 'On Paper 1, your Mathematics paper (Wed 7 Oct)')
  assert.equal(item.source, 'syllabus')
  assert.ok(np.score > score(signal()).score, 'a leaf on the nearest paper weighs 1.15')
}

{
  // Over three items: on_syllabus goes first, then the lowest confidence.
  const busy = score(
    signal({
      frequency: { papers: 7, of: 9, taggedShare: 1, scope: 'subject' },
      mastery: { percentage: 30, attempts: 3, lastAt: '2026-09-12' },
      reviewDueAt: '2026-09-17',
      onNearestPaper: true,
    })
  )
  assert.equal(busy.why.length, 3)
  assert.ok(!types(busy).includes('on_syllabus'))
  assert.deepEqual(types(busy), ['frequency', 'weak_area', 'review_due'], 'nearest_paper (medium, latest) was the cut')
  const four = score(signal({ frequency: { papers: 7, of: 9, taggedShare: 1, scope: 'subject' }, mastery: { percentage: 30, attempts: 3 } }))
  assert.deepEqual(types(four), ['on_syllabus', 'frequency', 'weak_area'])
}

// --- ranking ---------------------------------------------------------------------------------------

{
  const signals: TopicSignals[] = [
    signal({ code: '1.1', name: 'Quadratics', order: 0, parentCode: '1', prerequisiteOf: ['1.2', '1.3'], mastery: { percentage: 90, attempts: 4 } }),
    signal({ code: '1.2', name: 'Functions', order: 1, parentCode: '1', prerequisiteOf: ['1.3'], mastery: { percentage: 30, attempts: 4 } }),
    signal({ code: '1.3', name: 'Coordinate geometry', order: 2, parentCode: '1', mastery: { percentage: 50, attempts: 4 } }),
    signal({ code: '2.1', name: 'Vectors', order: 3 }),
  ]
  const ranked = rankSubjectTopics(signals, 'rusty', ctx(), { nameOf: (c) => signals.find((s) => s.code === c)?.name })
  for (const t of ranked) allWhy.push(t.why)
  assert.equal(ranked.length, 4)
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1]!.score >= ranked[i]!.score, 'sorted by score')
  assert.deepEqual(ranked.map((t) => t.band), ['must', 'must', 'must', 'should'], 'balanced: ceil(0.65 × 4) = 3 must, up to 85% should')
  assert.equal(ranked[0]!.code, '1.2', 'the weakest topic leads')
  // Quadratics comes before Functions in the syllabus and Functions ranks above it, so it earns the prerequisite line.
  const quad = ranked.find((t) => t.code === '1.1')!
  assert.ok(types(quad).includes('prerequisite'))
  assert.ok(quad.why.find((w) => w.type === 'prerequisite')!.explanation.includes('Functions'))
  assert.ok(!types(ranked.find((t) => t.code === '1.2')!).includes('prerequisite') || ranked.findIndex((t) => t.code === '1.3') < ranked.findIndex((t) => t.code === '1.2'))
  assert.ok(ranked.every((t) => t.mastery >= 0 && t.mastery <= 1))

  const foundation = rankSubjectTopics(signals, 'rusty', ctx({ mode: 'foundation' }))
  assert.deepEqual(foundation.map((t) => t.band), ['must', 'must', 'should', 'should'], 'foundation: ceil(0.5 × 4) = 2 must')
  const polish = rankSubjectTopics(Array.from({ length: 10 }, (_, i) => signal({ code: `3.${i}`, order: i })), undefined, ctx({ mode: 'polish' }))
  assert.deepEqual(
    polish.map((t) => t.band),
    ['must', 'must', 'must', 'must', 'must', 'must', 'must', 'must', 'should', 'could'],
    'polish: 8 must, 85% → 9th should, last could'
  )
  assert.deepEqual(polish.map((t) => t.code), Array.from({ length: 10 }, (_, i) => `3.${i}`), 'ties keep syllabus order')
  assert.deepEqual(rankSubjectTopics([], 'rusty', ctx()), [])
}

// --- a measured gap outranks representation ----------------------------------------------------------

{
  // Representation scales importance, so it lifts a topic in proportion to what there is to gain there. Whatever the
  // mode, the rating or the papers, a weak area (3+ marks under 65%) ranks above a strong topic with the same frequency.
  const freq = { papers: 9, of: 9, taggedShare: 1, scope: 'subject' as const }
  for (const mode of MODES) {
    for (const rating of RATINGS) {
      for (const f of [freq, { ...freq, papers: 5 }, undefined]) {
        const prior = rating ? SELF_RATING_PRIOR[rating] : 0.5
        const c = ctx({ mode })
        const weak = score(signal({ code: 'w', order: 5, frequency: f, mastery: { percentage: 30, attempts: 4 } }), prior, rating, c)
        const strong = score(signal({ code: 's', order: 0, frequency: f, mastery: { percentage: 80, attempts: 5 } }), prior, rating, c)
        assert.ok(types(weak).includes('weak_area'))
        assert.ok(!types(strong).includes('weak_area'))
        assert.ok(weak.score > strong.score, `${mode}/${rating ?? 'unrated'}/${f?.papers ?? 'no'} papers: weak ${weak.score} > strong ${strong.score}`)
        // A borderline weak area (just under the threshold) still beats a strong one with the same papers.
        const edge = score(signal({ code: 'e', order: 6, frequency: f, mastery: { percentage: WEAK_BELOW_PCT - 1, attempts: 3 } }), prior, rating, c)
        assert.ok(edge.score > strong.score, `${mode}: a 64% topic ranks above an 80% one with the same frequency`)
      }
    }
  }

  // The audit's case, in balanced mode: 80% on five marks with frequency 8/9 no longer outranks 30% on four marks
  // with no frequency signal at all — the old additive term put the mastered topic first.
  const c = ctx({ mode: 'balanced' })
  const differentiation = score(signal({ code: 'd', order: 9, frequency: { papers: 8, of: 9, taggedShare: 1, scope: 'subject' }, mastery: { percentage: 80, attempts: 5 } }), 0.35, 'rusty', c)
  const functions = score(signal({ code: 'f', order: 1, mastery: { percentage: 30, attempts: 4 } }), 0.35, 'rusty', c)
  assert.ok(functions.score > differentiation.score, `Functions ${functions.score} above Differentiation ${differentiation.score}`)

  // Against an untested topic whose only evidence is frequency, in balanced mode: a weak area with a gap of at least
  // 0.5 wins when the subject is rated confident (the prior says the untested topic is fine; the marks say this one is
  // not). The bound is arithmetic — gap_weak > gap_prior × √(1 + w.evidence × share) — so with a rusty or not-started
  // prior the untested topic's own gap is large and frequency may still put it first; that is intended.
  for (const pct of [50, 40, 30, 10]) {
    const weak = score(signal({ code: 'w', order: 5, mastery: { percentage: pct, attempts: 3 } }), SELF_RATING_PRIOR.confident, 'confident', c)
    const untested = score(signal({ code: 'u', order: 0, frequency: { papers: 9, of: 9, taggedShare: 1, scope: 'subject' } }), SELF_RATING_PRIOR.confident, 'confident', c)
    assert.deepEqual(types(untested), ['on_syllabus', 'frequency', 'self_rated'])
    assert.ok(types(weak).includes('weak_area'))
    assert.ok(1 - weak.mastery >= 0.5)
    assert.ok(weak.score > untested.score, `${pct}%: weak ${weak.score} > untested ${untested.score}`)
  }
  // And the general shape: a measured gap of 0.7 is never behind a measured gap of 0.2, whatever the frequency, in any mode.
  for (const mode of MODES) {
    const m = ctx({ mode })
    const big = score(signal({ code: 'b', order: 5, mastery: { percentage: 30, attempts: 3 } }), 0.5, undefined, m)
    const small = score(signal({ code: 's', order: 0, frequency: { papers: 9, of: 9, taggedShare: 1, scope: 'subject' }, mastery: { percentage: 80, attempts: 3 } }), 0.5, undefined, m)
    assert.ok(big.score > small.score, `${mode}: gap 0.7 without papers above gap 0.2 set in every paper`)
  }
  // Frequency still lifts an untested high-yield topic above an untested low-yield one.
  const high = score(signal({ code: 'h', order: 3, frequency: { papers: 9, of: 9, taggedShare: 1, scope: 'subject' } }), 0.5, undefined, c)
  const low = score(signal({ code: 'l', order: 2, frequency: { papers: 3, of: 9, taggedShare: 1, scope: 'subject' } }), 0.5, undefined, c)
  const none = score(signal({ code: 'n', order: 1 }), 0.5, undefined, c)
  assert.ok(high.score > low.score && low.score > none.score)
  assert.ok(Math.abs(high.score / none.score - (1 + MODE_WEIGHTS.balanced.evidence)) < 1e-9, 'set in every paper: importance × (1 + w.evidence)')
  // Evidence multiplies the product term only: a mastered topic with frequency still scores 0, and a due review adds on top.
  assert.equal(score(signal({ frequency: { papers: 9, of: 9, taggedShare: 1, scope: 'subject' }, mastery: { percentage: 100, attempts: 5 } })).score, 0)
  const due = score(signal({ frequency: { papers: 9, of: 9, taggedShare: 1, scope: 'subject' }, mastery: { percentage: 100, attempts: 5 }, reviewDueAt: '2026-09-17' }))
  assert.ok(Math.abs(due.score - MODE_WEIGHTS.balanced.review * (1 + MODE_WEIGHTS.balanced.urgency * 0)) < 1e-9, 'urgency 1 at planLength days out × w.review')
}

{
  // The syllabus-only line the scheduler gives a review of a topic the plan never opened: the same template buildWhy opens with.
  assert.deepEqual(syllabusOnlyWhy('Mathematics', 'Cambridge', 'P1/P2'), [
    { type: 'on_syllabus', source: 'syllabus', confidence: 'high', explanation: 'On the Cambridge Mathematics syllabus for Papers 1 and 2' },
  ])
  assert.equal(syllabusOnlyWhy('Mathematics')[0]!.explanation, 'On the Mathematics syllabus')
  assert.equal(syllabusOnlyWhy('Biology SL', 'IB', 'Paper 1')[0]!.explanation, 'On the IB Biology SL syllabus for Paper 1')
  assert.equal(syllabusOnlyWhy('Mathematics', '  ', '')[0]!.explanation, 'On the Mathematics syllabus')
  assert.deepEqual(syllabusOnlyWhy('Mathematics', 'Cambridge', 'P1/P2'), [score(signal({ paper: 'P1/P2' })).why[0]!], 'identical to what buildWhy opens with')
  for (const why of [syllabusOnlyWhy('Mathematics', 'Cambridge', 'P1'), syllabusOnlyWhy('A'.repeat(200))]) allWhy.push(why)
}

{
  const pool = rankSubjectTopics([signal({ code: 'a', order: 0 }), signal({ code: 'b', order: 1 }), signal({ code: 'c', order: 2 })], undefined, ctx())
  assert.deepEqual(eligibleTopics(pool, new Set(['a']), new Set(['c'])).map((t) => t.code), ['b'])
  assert.deepEqual(eligibleTopics(pool, NONE, NONE).map((t) => t.code), ['a', 'b', 'c'])
  assert.deepEqual(eligibleTopics(pool, new Set(['a', 'b', 'c']), NONE), [])
}

// --- invariants over every why[] this file produced ------------------------------------------------

assert.ok(allWhy.length > 20)
for (const why of allWhy) {
  assert.ok(why.length >= 1 && why.length <= 3, 'one to three items')
  for (const w of why) {
    assert.notEqual(w.type, 'core_syllabus', "'core_syllabus' is never emitted")
    assert.ok(w.explanation.length <= EVIDENCE_EXPLANATION_MAX, `explanation within ${EVIDENCE_EXPLANATION_MAX}: ${w.explanation}`)
    assert.ok(w.explanation.length > 0)
    if (w.type === 'frequency') assert.ok(w.stat && w.source === 'indexed_papers', 'a frequency claim carries its stat')
    if (w.source === 'indexed_papers') assert.notEqual(w.confidence, 'high')
    const lower = w.explanation.toLowerCase()
    for (const banned of FORBIDDEN_NUDGE_WORDS) assert.ok(!lower.includes(banned), `no "${banned}" in: ${w.explanation}`)
    assert.ok(!lower.includes('verified'))
    assert.ok(!lower.includes('will be on'))
  }
}

console.log('priority.test.ts: ok')
