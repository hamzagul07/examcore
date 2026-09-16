import assert from 'node:assert/strict'
import { rankTagsByPaper } from '@/lib/plan/high-yield-rank'

const NAMES: Record<string, string> = {
  '1.5': 'Trigonometry',
  '1.6': 'Series',
  '1.7': 'Differentiation',
  '1.10': 'Integration',
  '5.4': 'Probability',
}
const nameOf = (c: string) => NAMES[c]

function row(paper: string, session: string, tags: string[]) {
  return { paper_code: paper, paper_session: session, syllabus_tags: tags }
}

{
  const ranked = rankTagsByPaper(
    [
      // Three papers. Series is on all three; Trig on two (twice on one paper,
      // which must count once); Integration on one; Probability on one.
      row('9709/12', 'MJ2023', ['1.6', '1.5', '1.5']),
      row('9709/12', 'ON2023', ['1.6', '1.5', '1.10']),
      row('9709/13', 'MJ2024', ['1.6', '5.4', '1']),
      // A stray parent code and an unknown tag are ignored.
      row('9709/13', 'MJ2024', ['1', 'zz']),
    ],
    nameOf
  )
  assert.deepEqual(
    ranked.map((t) => [t.code, t.weight]),
    [
      ['1.6', 3],
      ['1.5', 2],
      ['1.10', 1],
      ['5.4', 1],
    ],
    'papers, not questions; ties by code numerically'
  )
  assert.equal(ranked[0]!.name, 'Series')
  assert.ok(ranked.every((t) => t.source === 'high_yield'))
}

{
  // Same question number across sessions is a different paper each time.
  const ranked = rankTagsByPaper(
    [row('9702/22', 'MJ2022', ['1.7']), row('9702/22', 'ON2022', ['1.7']), row('9702/22', 'MJ2023', ['1.7'])],
    nameOf
  )
  assert.deepEqual(ranked.map((t) => [t.code, t.weight]), [['1.7', 3]])
}

{
  // Limit and empties.
  const many = Array.from({ length: 5 }, (_, i) => row(`9709/1${i}`, 'MJ2024', ['1.5', '1.6', '1.7', '1.10', '5.4']))
  assert.equal(rankTagsByPaper(many, nameOf, 3).length, 3)
  assert.deepEqual(rankTagsByPaper([], nameOf), [])
  assert.deepEqual(rankTagsByPaper([row('9709/12', 'MJ2024', null as unknown as string[])], nameOf), [])
  assert.deepEqual(rankTagsByPaper([{ paper_code: null, paper_session: 'MJ2024', syllabus_tags: ['1.5'] }], nameOf), [])
}

console.log('high-yield-rank.test.ts: ok')
