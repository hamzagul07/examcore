import assert from 'node:assert/strict'
import { getTechniquePack } from '@/lib/max/technique-packs'
import { getCuratedMaxPack, listCuratedMaxPackCodes } from '@/lib/max/curated-packs'
import { buildMaxExamPack } from '@/lib/max/build-exam-pack'
import type { LeafMastery } from '@/lib/mastery'

async function main() {
  assert.ok(getTechniquePack('9709')?.links.some((l) => l.href.includes('9709')))
  assert.ok(getTechniquePack('9708')?.links.some((l) => l.href.includes('economics')))
  assert.ok(getTechniquePack('9999')?.links.some((l) => l.href.includes('command-words')))
  assert.equal(getTechniquePack(null), null)

  const codes = listCuratedMaxPackCodes()
  assert.ok(codes.includes('9709'))
  assert.ok(codes.includes('9708'))
  assert.ok(codes.includes('9706'))
  assert.ok(codes.includes('9618'))
  assert.equal(getCuratedMaxPack('9706')?.subjectCode, '9706')
  assert.equal(getCuratedMaxPack('9709')?.subjectCode, '9709')
  assert.ok((getCuratedMaxPack('9709')?.examinerDigest.length ?? 0) >= 3)

  const fakeSupabase = {
    from() {
      return {
        select() {
          return this
        },
        contains() {
          return this
        },
        like() {
          return this
        },
        gte() {
          return this
        },
        lte() {
          return this
        },
        limit() {
          return Promise.resolve({ data: [] })
        },
      }
    },
  } as never

  const mastery: LeafMastery[] = [
    {
      code: '1.1',
      name: 'Quadratics',
      paper: 'P1',
      paperName: 'Pure Mathematics 1',
      parent: { code: '1', name: 'Algebra' },
      level: 'critical',
      percentage: 40,
      attemptsCount: 3,
      totalMarksEarned: 4,
      totalMarksAvailable: 10,
    },
  ]

  const pack = await buildMaxExamPack({
    supabase: fakeSupabase,
    subjectCode: '9709',
    masteries: mastery,
    examDate: null,
  })
  assert.equal(pack.subjectCode, '9709')
  assert.equal(pack.isSprint, false)
  assert.equal(pack.days.length, 7)
  assert.equal(pack.completionKey, pack.weekLabel)
  assert.ok(pack.days.some((d) => d.kind === 'drill' || d.kind === 'timed_paper'))

  const soon = new Date()
  soon.setUTCDate(soon.getUTCDate() + 7)
  const examIso = soon.toISOString().slice(0, 10)
  const sprint = await buildMaxExamPack({
    supabase: fakeSupabase,
    subjectCode: '9709',
    masteries: mastery,
    examDate: examIso,
  })
  assert.equal(sprint.isSprint, true)
  assert.equal(sprint.days.length, 14)
  assert.equal(sprint.completionKey, `sprint:${examIso}`)
  assert.equal(sprint.timedPapers.length, 3)
  assert.ok(sprint.days.some((d) => d.kind === 'timed_paper'))
  assert.ok(sprint.days.some((d) => d.kind === 'review'))

  console.log('max-packs.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
