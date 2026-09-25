import assert from 'node:assert/strict'
import {
  getEnforcementMode,
  resetEnforcementModeWarning,
} from '@/lib/billing/enforcement-mode'

// The bug: an unset ENFORCEMENT_MODE in production meant 'off' — every cap
// silently disabled by the absence of a flag. Production now defaults to
// 'enforce'; dev and test keep 'off' so local marking needs no billing setup.

assert.equal(getEnforcementMode({ NODE_ENV: 'production' }), 'enforce', 'unset in prod → enforce')
assert.equal(
  getEnforcementMode({ NODE_ENV: 'production', ENFORCEMENT_MODE: 'enforec' }),
  'enforce',
  'a typo in prod is not a way to switch billing off'
)
assert.equal(getEnforcementMode({ NODE_ENV: 'development' }), 'off', 'unset in dev → off')
assert.equal(getEnforcementMode({ NODE_ENV: 'test' }), 'off', 'unset in test → off')
assert.equal(getEnforcementMode({}), 'off', 'no NODE_ENV at all is not production')

// Explicit values are honoured everywhere, including turning enforcement OFF in
// production on purpose (an incident switch), and are trimmed.
for (const env of ['production', 'development']) {
  assert.equal(getEnforcementMode({ NODE_ENV: env, ENFORCEMENT_MODE: 'off' }), 'off')
  assert.equal(getEnforcementMode({ NODE_ENV: env, ENFORCEMENT_MODE: 'warn' }), 'warn')
  assert.equal(getEnforcementMode({ NODE_ENV: env, ENFORCEMENT_MODE: ' enforce ' }), 'enforce')
}

// The default is logged once per process, not once per gate.
{
  resetEnforcementModeWarning()
  const original = console.warn
  let warnings = 0
  console.warn = () => {
    warnings += 1
  }
  try {
    getEnforcementMode({ NODE_ENV: 'production' })
    getEnforcementMode({ NODE_ENV: 'production' })
    getEnforcementMode({ NODE_ENV: 'production', ENFORCEMENT_MODE: 'bogus' })
  } finally {
    console.warn = original
  }
  assert.equal(warnings, 1, 'the production default warns exactly once')
}

console.log('enforcement-mode.test.ts: ok')
