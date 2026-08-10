import assert from 'node:assert/strict'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'

const short = normalizePaperSession('w24')
assert.equal(short.label, 'October/November 2024')
assert.equal(short.season, 'October/November')
assert.equal(short.year, 2024)

const full = normalizePaperSession('May/June 2023')
assert.equal(full.label, 'May/June 2023')
assert.equal(full.year, 2023)

const href = pastPaperMarkHref({
  paperCode: '9709/12',
  paperSession: 'w24',
  questionNumber: '9(a)',
  pattern: 'Quadratics',
  returnTo: 'vault',
})
assert.ok(href.includes('practice=1'))
assert.ok(href.includes('q=9'))
assert.ok(href.includes('return=vault'))
assert.ok(href.includes(encodeURIComponent('October/November 2024')) || href.includes('October%2FNovember+2024') || href.includes('October%2FNovember%202024'))

console.log('normalize-paper-session.test.ts: ok')
