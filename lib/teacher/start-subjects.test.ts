/**
 * Run: npx tsx lib/teacher/start-subjects.test.ts
 *
 * The teacher setup form must offer every enabled board a non-empty subject
 * list, and only subjects lib/onboarding/save-profile.ts accepts.
 */
import assert from 'node:assert/strict'
import {
  BOARDS,
  IB_BOARD_ID,
  IB_DIPLOMA_LEVEL,
  isSubjectValidForProfile,
} from '@/lib/profile-options'
import { startLevelFor, startLevels, startSubjectGroups } from '@/lib/teacher/start-subjects'

// Every enabled board, at every level it offers, has something to pick, and
// every option passes the server's validation for that board + level.
for (const board of BOARDS.filter((b) => b.enabled)) {
  const levels = startLevels(board.id)
  assert.ok(levels.length > 0, `${board.id}: no levels`)
  for (const level of levels) {
    const groups = startSubjectGroups(board.id, level.id)
    const options = groups.flatMap((g) => g.options)
    assert.ok(options.length > 0, `${board.id} / ${level.id}: no subjects`)
    for (const s of options) {
      assert.ok(
        isSubjectValidForProfile(board.id, level.id, s.id),
        `${board.id} / ${level.id}: ${s.id} would be rejected by save-profile`
      )
    }
    // No subject is listed twice, and no group is empty.
    assert.equal(new Set(options.map((s) => s.id)).size, options.length, `${board.id} / ${level.id}: duplicate`)
    assert.ok(groups.every((g) => g.options.length > 0))
  }
}

// The regression: IB used to come back empty because IB subjects are not in
// the Cambridge list.
const ib = startSubjectGroups(IB_BOARD_ID, IB_DIPLOMA_LEVEL).flatMap((g) => g.options)
assert.ok(ib.length > 0)
assert.ok(ib.every((s) => s.id.startsWith('ib-')), 'IB offers IB subjects only')

// Cambridge A-Level offers 9709 Maths; a Cambridge level never offers IB codes.
const caie = startSubjectGroups('Cambridge International', 'A-Level').flatMap((g) => g.options)
assert.ok(caie.some((s) => s.code === '9709'))
assert.ok(caie.every((s) => !s.id.startsWith('ib-')))

// Level normalisation: IB always submits the Diploma; a board without the
// chosen level falls back to one it has.
assert.equal(startLevelFor(IB_BOARD_ID, 'A-Level'), IB_DIPLOMA_LEVEL)
assert.equal(startLevelFor('Cambridge International', 'O-Level'), 'O-Level')
// A level with no subjects in the catalogue is not offered at all.
for (const level of startLevels('Cambridge International')) {
  assert.ok(startSubjectGroups('Cambridge International', level.id).length > 0)
}
assert.equal(startLevelFor('Cambridge International', IB_DIPLOMA_LEVEL), 'A-Level')
assert.equal(startLevelFor('AP', 'IGCSE'), 'A-Level')

console.log('start-subjects.test.ts — all assertions passed')
