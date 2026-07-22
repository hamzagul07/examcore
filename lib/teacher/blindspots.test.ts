import assert from 'node:assert/strict'
import {
  actionable,
  levelFor,
  rankBlindspots,
  type BlindspotInput,
} from '@/lib/teacher/blindspots'

function t(
  code: string,
  avgMastery: number,
  studentsAttempted: number,
  totalStudents = 28
): BlindspotInput {
  return { code, name: `Topic ${code}`, paper: 'P1', avgMastery, studentsAttempted, totalStudents }
}

function main() {
  // Thresholds must match lib/mastery, or teacher and student views disagree
  // about what "critical" means for the same topic.
  assert.equal(levelFor(39.9), 'critical')
  assert.equal(levelFor(40), 'proficient')
  assert.equal(levelFor(74.9), 'proficient')
  assert.equal(levelFor(75), 'secure')

  const ranked = rankBlindspots([
    t('a', 62, 20),
    t('b', 31, 18),
    t('c', 48, 25),
    t('d', 31, 4), // same score as b, far less evidence
  ])

  assert.deepEqual(
    ranked.map((r) => r.code),
    ['b', 'd', 'c', 'a'],
    'weakest first; ties break toward the better-evidenced topic'
  )

  const b = ranked.find((r) => r.code === 'b')!
  assert.equal(b.level, 'critical')
  assert.equal(b.coveragePct, 64)
  assert.equal(b.thinEvidence, false)

  // 4 of 28 is under a quarter of the class — weak evidence, flagged so a
  // teacher doesn't reteach a topic on the strength of four scripts.
  const d = ranked.find((r) => r.code === 'd')!
  assert.equal(d.thinEvidence, true)
  assert.equal(d.coveragePct, 14)

  // A tiny class: the floor is 3 students, not 25% of 4.
  const small = rankBlindspots([t('x', 30, 3, 4), t('y', 30, 2, 4)])
  assert.equal(small.find((r) => r.code === 'x')!.thinEvidence, false)
  assert.equal(small.find((r) => r.code === 'y')!.thinEvidence, true)

  // An intervention should target what's weak AND trustworthy.
  const act = actionable(ranked)
  assert.deepEqual(act.map((r) => r.code), ['b', 'c', 'a'])
  assert.ok(!act.some((r) => r.thinEvidence), 'never target thin evidence')

  // Classrooms with no students can't produce a percentage.
  assert.deepEqual(rankBlindspots([t('z', 50, 0, 0)]), [])

  // The list is capped so one screen stays scannable.
  const many = Array.from({ length: 30 }, (_, i) => t(`t${i}`, i * 2, 20))
  assert.equal(rankBlindspots(many).length, 8)
  assert.equal(rankBlindspots(many, 3).length, 3)

  console.log('blindspots.test.ts: ok')
}

main()
