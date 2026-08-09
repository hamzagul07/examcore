import assert from 'node:assert/strict'
import { getResultsDayBannerCopy } from './results-day'

// Peak organic week: Hold stays primary even when June 2026 data is live.
{
  const copy = getResultsDayBannerCopy({
    phase: 'threshold-week',
    subjectCode: '9709',
    hasJune2026Data: true,
  })
  assert.equal(copy.primaryHref, '/tools/will-my-grade-hold?code=9709')
  assert.equal(copy.primaryLabel, 'Will my grade hold?')
  assert.match(copy.secondaryHref ?? '', /grade-boundary-calculator/)
}

{
  const copy = getResultsDayBannerCopy({
    phase: 'threshold-week',
    hasJune2026Data: false,
  })
  assert.equal(copy.primaryHref, '/tools/will-my-grade-hold')
  assert.equal(copy.primaryLabel, 'Will my grade hold?')
}

{
  const copy = getResultsDayBannerCopy({
    phase: 'post-igcse',
    subjectCode: '0580',
  })
  assert.equal(copy.primaryHref, '/tools/will-my-grade-hold?code=0580')
}

console.log('results-day.test.ts: ok')
