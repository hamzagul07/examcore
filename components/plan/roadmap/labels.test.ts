import assert from 'node:assert/strict'
import { isCalmCopy } from '@/lib/plan/feasibility'
import { carryFitLine, dayLabel, historyLabel, historyTallyLine, standingLabel } from '@/components/plan/roadmap/labels'

// A past day's words: done, skipped and moved keep theirs; everything that did not happen is "Not done".
assert.equal(historyLabel('done'), 'Done')
assert.equal(historyLabel('skipped'), 'Skipped')
assert.equal(historyLabel('deferred', { status: 'deferred', deferredTo: '2026-10-01', at: 'x' }), standingLabel('deferred', { status: 'deferred', deferredTo: '2026-10-01', at: 'x' }))
assert.equal(historyLabel('deferred'), 'Moved to another day')
assert.equal(historyLabel('dropped', { status: 'dropped', at: 'x', auto: true }), 'Not done')
assert.equal(historyLabel('dropped'), 'Not done')
assert.equal(historyLabel('todo'), 'Not done')
assert.equal(historyLabel('started'), 'Not done')
for (const s of ['done', 'skipped', 'deferred', 'dropped', 'todo', 'started'] as const) assert.ok(isCalmCopy(historyLabel(s)), `${s} stays calm`)

// The day's count, facts only.
assert.equal(historyTallyLine({ total: 0, done: 0, skipped: 0, moved: 0, notDone: 0 }), '')
assert.equal(historyTallyLine({ total: 5, done: 3, skipped: 0, moved: 0, notDone: 2 }), '3 of 5 done')
assert.equal(historyTallyLine({ total: 5, done: 3, skipped: 1, moved: 1, notDone: 0 }), '3 of 5 done · 1 moved · 1 skipped')
assert.ok(!/%/.test(historyTallyLine({ total: 4, done: 1, skipped: 0, moved: 0, notDone: 3 })), 'never a percentage')

// Day labels for the carry-over sheet.
assert.equal(dayLabel('2026-09-23', '2026-09-23'), 'Today')
assert.equal(dayLabel('2026-09-24', '2026-09-23'), 'Tomorrow')
assert.equal(dayLabel('2026-10-01', '2026-09-30'), 'Tomorrow', 'across a month end')
assert.notEqual(dayLabel('2026-09-25', '2026-09-23'), 'Tomorrow')

// What carrying to a day means, in one line each.
assert.equal(carryFitLine({ minutes: 20, fit: 'full', inHand: 35 }), '20 min · about 35 min in hand there')
assert.equal(carryFitLine({ minutes: 20, fit: 'full', inHand: 0 }), '20 min · fits')
assert.equal(carryFitLine({ minutes: 15, fit: 'shortened', inHand: 0 }), 'Shortened to 15 min — the room that day has')
assert.equal(carryFitLine({ minutes: 20, fit: 'over', over: 20, inHand: 0 }), "20 min, running 20 min past that day's last window")
for (const fit of ['full', 'shortened', 'over'] as const) assert.ok(isCalmCopy(carryFitLine({ minutes: 20, fit, over: 5, inHand: 5 })))

console.log('components/plan/roadmap/labels.test.ts: ok')
