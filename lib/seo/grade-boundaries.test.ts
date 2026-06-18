import assert from 'node:assert/strict'
import { computeGrade, A_LEVEL_GRADES } from './grade-boundaries'

const thresholds = [
  { grade: 'A*', mark: 90 },
  { grade: 'A', mark: 80 },
  { grade: 'B', mark: 70 },
  { grade: 'C', mark: 60 },
  { grade: 'D', mark: 50 },
  { grade: 'E', mark: 40 },
]

// Lands on a B, 10 marks below an A.
let r = computeGrade(75, 100, thresholds)
assert.equal(r.grade, 'B', 'grade B')
assert.equal(r.nextGrade, 'A', 'next A')
assert.equal(r.marksToNext, 5, 'B->A gap')
assert.equal(r.percent, 75, 'percent')

// Exactly on the A* boundary → A*, top of ladder.
r = computeGrade(90, 100, thresholds)
assert.equal(r.grade, 'A*', 'A* boundary inclusive')
assert.equal(r.nextGrade, null, 'no grade above A*')
assert.equal(r.marksToNext, null, 'no marks to next at top')

// Below E → ungraded, reports gap to E.
r = computeGrade(30, 100, thresholds)
assert.equal(r.grade, 'U', 'ungraded')
assert.equal(r.nextGrade, 'E', 'next is E')
assert.equal(r.marksToNext, 10, 'gap to E')

// Blank thresholds → no grade but still a percentage.
r = computeGrade(50, 100, A_LEVEL_GRADES.map((g) => ({ grade: g, mark: '' as const })))
assert.equal(r.grade, null, 'no thresholds -> null grade')
assert.equal(r.percent, 50, 'percent still computed')

// Unsorted input is handled (highest boundary wins).
r = computeGrade(82, 100, [
  { grade: 'B', mark: 70 },
  { grade: 'A*', mark: 90 },
  { grade: 'A', mark: 80 },
])
assert.equal(r.grade, 'A', 'unsorted -> A')
assert.equal(r.marksToNext, 8, 'A->A* gap from unsorted')

// --- verified official data integrity ---
import fs from 'node:fs'
import path from 'node:path'
const dataDir = path.join(process.cwd(), 'content', 'data', 'grade-boundaries')
if (fs.existsSync(dataDir)) {
  for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
    assert.equal(`${data.code}.json`, file, `${file}: code matches filename`)
    assert.ok(data.sessions?.length, `${file}: has sessions`)
    for (const s of data.sessions) {
      assert.ok(s.sourceUrl?.includes('cambridgeinternational.org'), `${file} ${s.session}: official source URL`)
      for (const c of s.components) {
        const t = c.thresholds
        const order = [t.A, t.B, t.C, t.D, t.E]
        for (let i = 1; i < order.length; i++) {
          assert.ok(order[i] < order[i - 1], `${file} ${s.session} ${c.component}: thresholds must strictly descend (${order.join(',')})`)
        }
        assert.ok(t.A <= c.max, `${file} ${s.session} ${c.component}: A (${t.A}) must be <= max (${c.max})`)
        assert.ok(t.E >= 0, `${file} ${s.session} ${c.component}: E >= 0`)
      }
    }
  }
}

console.log('grade-boundaries.test.ts: ok')
