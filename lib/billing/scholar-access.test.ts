import assert from 'node:assert/strict'

import { effectiveAccess } from '@/lib/billing/access'
import { capForAccess, omniCapForAccess } from '@/lib/billing/caps'
import {
  canSwitchVaultSubject,
  hasDeepMarking,
  hasEarlyAccess,
  hasFullMarksRewrite,
  hasMaxResourceVault,
  hasMaxWeeklyCoach,
  hasPaidAccess,
  hasPriorityMarking,
  hasResourceVault,
  vaultSubjectLimit,
} from '@/lib/billing/features'

// --- Scholar is its own access level -----------------------------------------
// It used to collapse into `pro`, which is why it could never hold a feature.

assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'active' }),
  'scholar',
  'a paying Scholar resolves to its own access level'
)
assert.equal(
  effectiveAccess({ tier: 'mastery', status: 'active' }),
  'max',
  'Max is unchanged'
)
assert.equal(
  effectiveAccess({ tier: 'student', status: 'active' }),
  'pro',
  'legacy Pro still resolves to pro'
)
assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'canceled' }),
  'free',
  'a lapsed Scholar is free, as before'
)
assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'past_due' }),
  'scholar',
  'past_due keeps access through the dunning window'
)

// --- Scholar keeps every shared paid feature ---------------------------------
// The point of the tier is scope, not a worse product.

assert.ok(hasPaidAccess('scholar'), 'Scholar is paid access')
assert.ok(hasDeepMarking('scholar'), 'Scholar keeps the second-opinion verify pass')
assert.ok(hasFullMarksRewrite('scholar'), 'Scholar keeps rewrite-to-full-marks')

// --- Scholar gets the real Vault, for one subject ----------------------------

assert.ok(hasResourceVault('scholar'), 'Scholar can open the Vault')
assert.ok(hasResourceVault('max'), 'Max can open the Vault')
assert.ok(!hasResourceVault('pro'), 'legacy Pro cannot')
assert.ok(!hasResourceVault('free'), 'free cannot')

assert.equal(vaultSubjectLimit('scholar'), 1, 'Scholar sees one subject desk')
assert.equal(vaultSubjectLimit('max'), null, 'Max sees the whole shelf')
assert.ok(!canSwitchVaultSubject('scholar'), 'no switcher on a one-subject vault')
assert.ok(canSwitchVaultSubject('max'), 'Max keeps the switcher')

// --- Max exclusives stay exclusive -------------------------------------------
// If any of these start returning true for Scholar, the tiers have collapsed
// again and Max has nothing left to sell.

assert.ok(!hasMaxResourceVault('scholar'), 'the all-subject vault stays Max')
assert.ok(!hasPriorityMarking('scholar'), 'priority marking stays Max')
assert.ok(!hasMaxWeeklyCoach('scholar'), 'the weekly coach stays Max')
assert.ok(!hasEarlyAccess('scholar'), 'early access stays Max')

// --- Allowances are untouched by the new level -------------------------------
// Caps key off the real tier, so splitting access must not move a single number.

assert.equal(capForAccess('scholar', 'scholar'), 120, 'Scholar marking cap unchanged')
assert.equal(omniCapForAccess('scholar', 'scholar'), 150, 'Scholar chat cap unchanged')
assert.equal(capForAccess('max', 'mastery'), 250, 'Max marking cap unchanged')
assert.equal(capForAccess('free', 'free'), 5, 'free cap unchanged')

// --- comps floor access, never lower it --------------------------------------
// Used to hand an early Scholar the fuller experience while the tier is built.

assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'active', accessOverride: 'max' }),
  'max',
  'a comped Scholar gets Max-level access'
)
assert.equal(
  effectiveAccess({ tier: 'mastery', status: 'active', accessOverride: 'scholar' }),
  'max',
  'a comp never demotes someone who already pays for more'
)
assert.equal(
  effectiveAccess({ tier: 'scholar', status: 'active', accessOverride: null }),
  'scholar',
  'no comp leaves access untouched'
)
assert.equal(
  effectiveAccess({ tier: 'free', status: 'canceled', accessOverride: 'max' }),
  'max',
  'a comp can lift a free account, for a granted trial'
)
assert.ok(
  hasResourceVault(
    effectiveAccess({ tier: 'scholar', status: 'active', accessOverride: 'max' })
  ),
  'a comped Scholar opens the full vault'
)
assert.equal(
  vaultSubjectLimit(
    effectiveAccess({ tier: 'scholar', status: 'active', accessOverride: 'max' })
  ),
  null,
  'and sees the whole shelf, not one subject'
)

// A comp grants the experience, never the consumption. Marking and chat cost
// real money per use and the subscriber pays Scholar for them — and keeping the
// cap on the paid tier is what lets the billing page keep saying Scholar.
assert.equal(
  capForAccess('max', 'scholar'),
  120,
  'a comped Scholar keeps the Scholar marking allowance'
)
assert.equal(
  omniCapForAccess('max', 'scholar'),
  150,
  'a comped Scholar keeps the Scholar chat allowance'
)

console.log('scholar-access.test.ts — all assertions passed')
