import assert from 'node:assert/strict'
import { capForTier, omniCapForTier, tierMarketingName } from '@/lib/billing/caps'
import { DISPLAY_PRICES_USD } from '@/lib/polar/products'

/**
 * The ladder has to rise in both directions at once, and it is easy to break by
 * changing one number: a tier that costs more for fewer marks, or a cheaper tier
 * whose marks are better value than the one above it, makes the expensive plan
 * irrational to buy. That was the actual state before Starter existed — the free
 * tier gave 5 marks a month while a guest got 10 a DAY.
 */

const TIERS = ['free', 'student', 'scholar', 'mastery'] as const
const PAID = ['student', 'scholar', 'mastery'] as const

// Marks rise with every step up.
for (let i = 1; i < TIERS.length; i++) {
  assert.ok(
    capForTier(TIERS[i]!) > capForTier(TIERS[i - 1]!),
    `${TIERS[i]} must mark more than ${TIERS[i - 1]}`
  )
  assert.ok(
    omniCapForTier(TIERS[i]!) > omniCapForTier(TIERS[i - 1]!),
    `${TIERS[i]} must allow more chat than ${TIERS[i - 1]}`
  )
}

// Price rises with every paid step up.
for (let i = 1; i < PAID.length; i++) {
  assert.ok(
    DISPLAY_PRICES_USD[PAID[i]!].monthly > DISPLAY_PRICES_USD[PAID[i - 1]!].monthly,
    `${PAID[i]} must cost more than ${PAID[i - 1]}`
  )
}

// ...and the price PER MARK falls, so each step up is better value, not just
// more of it. Without this a tier can be strictly dominated by the one below.
for (let i = 1; i < PAID.length; i++) {
  const cheaper = DISPLAY_PRICES_USD[PAID[i - 1]!].monthly / capForTier(PAID[i - 1]!)
  const dearer = DISPLAY_PRICES_USD[PAID[i]!].monthly / capForTier(PAID[i]!)
  assert.ok(
    dearer < cheaper,
    `${PAID[i]} must be better value per mark than ${PAID[i - 1]} (${dearer.toFixed(2)}c vs ${cheaper.toFixed(2)}c)`
  )
}

/**
 * Annual is "about ten months for twelve" — the ~17% the page advertises.
 *
 * Not exactly 10x: Scholar lists at $199 rather than $199.90, because a round
 * number reads better on the card, and Starter/Max happen to land exactly on
 * 10x. So the invariant is the CLAIM, not the arithmetic — annual must save
 * between one and three months against paying monthly. Outside that band the
 * toggle is either lying about the saving or giving the year away.
 */
for (const tier of PAID) {
  const { monthly, yearly } = DISPLAY_PRICES_USD[tier]
  const monthsPaid = yearly / monthly
  assert.ok(
    monthsPaid >= 9 && monthsPaid <= 11,
    `${tier} annual is ${monthsPaid.toFixed(2)} months of the monthly price — expected 9–11`
  )
  assert.ok(yearly < monthly * 12, `${tier} annual must beat paying monthly`)
}

// Starter is the entry step, and the gap it exists to close must stay closed:
// it has to sit strictly between free and Scholar in price.
assert.ok(DISPLAY_PRICES_USD.student.monthly > 0, 'Starter is a paid plan')
assert.ok(
  DISPLAY_PRICES_USD.student.monthly < DISPLAY_PRICES_USD.scholar.monthly / 2,
  'Starter must be well under half of Scholar, or it is not an entry step'
)

// The brand names the sell surface renders.
assert.equal(tierMarketingName('free'), 'Free')
assert.equal(tierMarketingName('student'), 'Starter')
assert.equal(tierMarketingName('scholar'), 'Scholar')
assert.equal(tierMarketingName('mastery'), 'Max')

console.log('pricing-ladder.test.ts: ok')
