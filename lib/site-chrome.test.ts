import assert from 'node:assert/strict'
import {
  getSiteChromeVariant,
  shouldShowAppHeader,
} from '@/lib/site-chrome'

assert.equal(
  getSiteChromeVariant('/edexcel/international-a-level/mathematics'),
  'marketing'
)
assert.equal(
  shouldShowAppHeader('/edexcel/international-a-level/mathematics'),
  false,
  'board hubs must not mount the student AppHeader'
)

for (const path of [
  '/caie/a-level/mathematics/9709',
  '/oxfordaqa/international-a-level/mathematics',
  '/aqa/a-level/mathematics',
  '/ap/calculus-ab',
  '/results-2026/edexcel',
  '/for-teachers',
]) {
  assert.equal(getSiteChromeVariant(path), 'marketing', path)
  assert.equal(shouldShowAppHeader(path), false, path)
}

assert.equal(getSiteChromeVariant('/for-teachers/start'), 'none')
assert.equal(shouldShowAppHeader('/for-teachers/start'), false)

assert.equal(shouldShowAppHeader('/mark'), true)
assert.equal(shouldShowAppHeader('/dashboard'), true)
assert.equal(shouldShowAppHeader('/embed/mark-demo'), false)

console.log('site-chrome.test.ts: ok')
