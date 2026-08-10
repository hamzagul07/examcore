import assert from 'node:assert/strict'
import {
  hasEarlyAccess,
  hasMaxResourceVault,
  hasMaxWeeklyCoach,
  hasPriorityMarking,
  isMax,
  hasPaidAccess,
  hasFullMarksRewrite,
} from '@/lib/billing/features'

assert.equal(isMax('max'), true)
assert.equal(isMax('pro'), false)
assert.equal(hasMaxResourceVault('max'), true)
assert.equal(hasMaxResourceVault('pro'), false)
assert.equal(hasPriorityMarking('max'), true)
assert.equal(hasMaxWeeklyCoach('max'), true)
assert.equal(hasEarlyAccess('max'), true)
// Shared paid features stay on Pro/Scholar — Max adds on top, does not strip.
assert.equal(hasPaidAccess('pro'), true)
assert.equal(hasFullMarksRewrite('pro'), true)
assert.equal(hasFullMarksRewrite('max'), true)

console.log('max-features.test.ts: ok')
