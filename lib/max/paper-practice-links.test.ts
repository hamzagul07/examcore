import assert from 'node:assert/strict'
import {
  courseHubHref,
  paperPracticeLinks,
  pastPaperHubHref,
  timedPaperSlots,
} from '@/lib/max/paper-practice-links'

assert.equal(pastPaperHubHref('9709'), '/past-papers/9709')
assert.equal(pastPaperHubHref('ib-maths-aa-hl'), '/ib/past-papers/maths-aa-hl')
assert.equal(courseHubHref('ib-maths-aa-hl'), '/ib/courses/maths-aa-hl')
assert.equal(courseHubHref('9702'), '/courses/9702')

const ib = paperPracticeLinks('ib-maths-aa-hl')
assert.ok(ib.some((l) => l.href.includes('ibo.org')), 'IBO official present')
assert.ok(ib.some((l) => l.href === '/ib/past-papers/maths-aa-hl'), 'IB desk present')
assert.ok(!ib.some((l) => l.href.includes('/past-papers/ib-')), 'no broken Cambridge IB path')

const cam = paperPracticeLinks('9709')
assert.equal(cam.length, 1)
assert.equal(cam[0]?.href, '/past-papers/9709')

const timed = timedPaperSlots('ib-maths-aa-hl')
assert.equal(timed.length, 3)
assert.ok(timed[0]?.href.includes('ibo.org') || timed[0]?.href.startsWith('http'))
assert.ok(!timed.some((t) => t.href.includes('/past-papers/ib-')))

console.log('paper-practice-links.test.ts: ok')
