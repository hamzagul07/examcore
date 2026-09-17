import assert from 'node:assert/strict'
import { FREQUENCY_MIN_HITS, FREQUENCY_MIN_PAPERS, frequencyFor, paperFrequency, rankTagsByPaper } from '@/lib/plan/high-yield-rank'

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

// --- indexed-paper frequency ------------------------------------------------------------------

/** A paper of `questions` rows, the first `tagged` of them carrying `tags`. */
function paper(code: string, session: string, questions: number, tagged: number, tags: string[]) {
  return Array.from({ length: questions }, (_, i) => row(code, session, i < tagged ? tags : (null as unknown as string[])))
}

{
  // 9609-shaped: three papers, four tagged questions in all → no frequency for any code.
  const rows = [...paper('9609/12', 's24', 20, 2, ['1.5']), ...paper('9609/22', 's24', 20, 1, ['1.5']), ...paper('9609/32', 'w24', 20, 1, ['1.5'])]
  const freq = paperFrequency(rows, nameOf)
  assert.equal(freq.of, 0)
  assert.equal(freq.byTag.size, 0)
  assert.equal(freq.taggedShare, 0)
  assert.equal(freq.from, undefined)
  assert.equal(frequencyFor(freq, '1.5'), undefined)
}

{
  // Nine well-tagged papers, a tag on all nine → { papers: 9, of: 9 }; a tag on two → nothing.
  const sessions = ['s24', 'w24', 'm25', 's25', 'w25', 's24', 'w24', 's25', 'w25']
  const rows = sessions.flatMap((session, i) => paper(`9709/1${i % 3}`, session, 10, 8, i < 2 ? ['1.6', '1.5'] : ['1.6', '1']))
  const freq = paperFrequency(rows, nameOf)
  assert.equal(freq.of, 9)
  assert.equal(freq.scope, 'subject')
  assert.equal(freq.from, 'May/June 2024', 'earliest session by year then season')
  assert.equal(freq.to, 'Oct/Nov 2025')
  assert.equal(freq.taggedShare, 0.8)
  assert.deepEqual(frequencyFor(freq, '1.6'), { papers: 9, of: 9, from: 'May/June 2024', to: 'Oct/Nov 2025', taggedShare: 0.8, scope: 'subject' })
  assert.equal(frequencyFor(freq, '1.5'), undefined, 'two hits is below FREQUENCY_MIN_HITS')
  assert.equal(frequencyFor(freq, '1'), undefined, 'a parent code is never counted')
  assert.equal(freq.byTag.get('1'), undefined)
  assert.ok(FREQUENCY_MIN_HITS === 3 && FREQUENCY_MIN_PAPERS === 6)
}

{
  // A paper with many questions and few tagged is not well tagged, whatever its tag count.
  const rows = [...paper('9709/12', 's24', 40, 6, ['1.6']), ...paper('9709/13', 's24', 10, 6, ['1.6'])]
  const freq = paperFrequency(rows, nameOf)
  assert.equal(freq.of, 1, 'six of forty is under half')
  assert.equal(freq.taggedShare, 0.6)
}

{
  // Component filtering changes `of`; full session labels are read too.
  const rows = [
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => paper('9709/12', `s2${i}`, 10, 10, ['1.6'])),
    ...[0, 1, 2].flatMap((i) => paper('9709/32', `October/November 202${i}`, 10, 10, ['1.7'])),
  ]
  const all = paperFrequency(rows, nameOf)
  assert.equal(all.of, 9)
  assert.equal(all.from, 'May/June 2020')
  assert.equal(all.to, 'May/June 2025')
  const p1 = paperFrequency(rows, nameOf, { componentDigit: '1' })
  assert.equal(p1.of, 6)
  assert.equal(p1.scope, 'component')
  assert.equal(frequencyFor(p1, '1.6')?.papers, 6)
  assert.equal(frequencyFor(p1, '1.7'), undefined)
  const p3 = paperFrequency(rows, nameOf, { componentDigit: '3' })
  assert.equal(p3.of, 3)
  assert.equal(p3.to, 'Oct/Nov 2022')
  assert.equal(frequencyFor(p3, '1.7'), undefined, 'three papers is under FREQUENCY_MIN_PAPERS')
  assert.equal(paperFrequency(rows, nameOf, { componentDigit: null }).of, 9)
}

assert.equal(paperFrequency([], nameOf).of, 0)
assert.equal(paperFrequency([{ paper_code: null, paper_session: 's24', syllabus_tags: ['1.5'] }], nameOf).of, 0)

console.log('high-yield-rank.test.ts: ok')
