#!/usr/bin/env node
/**
 * One-time Stripe product/price creation + pricing_config seed (Sprint 42).
 *
 * Run AFTER setting STRIPE_SECRET_KEY (test mode) in .env.local:
 *   node scripts/setup-stripe-products.mjs
 *
 * What it does:
 *   1. Creates (or reuses) one Stripe Product per logical product key.
 *   2. Creates prices for every (region tier x currency [x billing period]).
 *   3. Upserts every created price into the `pricing_config` table.
 *   4. Writes scripts/stripe-products-output.json for record-keeping.
 *
 * Idempotency: products are looked up by a metadata key (`examcore_product`)
 * before creation, and pricing_config rows are upserted on their unique
 * constraint. Re-running creates NEW Stripe prices (Stripe prices are
 * immutable) but won't duplicate products or pricing_config rows. Pass
 * --dry-run to preview without touching Stripe or the DB.
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')

function loadEnvFile(filename) {
  const path = join(ROOT, filename)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile('.env.local')

// --- Pricing definitions (USD cents) ---------------------------------------

const PRICING = {
  student: {
    A: { monthly: 900, yearly: 7900 }, // $9 / $79
    B: { monthly: 500, yearly: 4500 }, // $5 / $45
    C: { monthly: 300, yearly: 2500 }, // $3 / $25
  },
  scholar: {
    A: { monthly: 1900, yearly: 14900 }, // $19 / $149
    B: { monthly: 1100, yearly: 8900 }, // $11 / $89
    C: { monthly: 700, yearly: 5500 }, // $7 / $55
  },
  mastery: {
    A: { monthly: 3900, yearly: 32900 }, // $39 / $329
    B: { monthly: 2200, yearly: 18900 }, // $22 / $189
    C: { monthly: 1500, yearly: 12900 }, // $15 / $129
  },
  credits_25: { A: 500, B: 300, C: 200 },
  credits_100: { A: 1500, B: 900, C: 600 },
  credits_500: { A: 5000, B: 3000, C: 2000 },
}

const CURRENCIES_PER_TIER = {
  A: ['usd', 'gbp', 'eur', 'aud'],
  B: ['usd', 'eur'],
  C: ['usd', 'inr', 'pkr'],
}

// Approximate FX from USD. Update at script-run time if rates drift.
const FX = { usd: 1, gbp: 0.79, eur: 0.92, aud: 1.52, inr: 83, pkr: 280 }

// Round to a sensible unit per currency so prices look intentional, not noisy.
const ROUND_TO_CENTS = { usd: 1, gbp: 1, eur: 1, aud: 1, inr: 100, pkr: 10000 }

const SUBSCRIPTION_KEYS = ['student', 'scholar', 'mastery']
const CREDIT_KEYS = ['credits_25', 'credits_100', 'credits_500']

const DISPLAY_NAMES = {
  student: 'Examcore Student',
  scholar: 'Examcore Scholar',
  mastery: 'Examcore Mastery',
  credits_25: 'Examcore Credits 25',
  credits_100: 'Examcore Credits 100',
  credits_500: 'Examcore Credits 500',
}

function convert(usdCents, currency) {
  const raw = usdCents * (FX[currency] ?? 1)
  const unit = ROUND_TO_CENTS[currency] ?? 1
  return Math.max(unit, Math.round(raw / unit) * unit)
}

// --- Clients ----------------------------------------------------------------

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'))
const supabase = createClient(
  requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY')
)

// --- Product helpers --------------------------------------------------------

async function getOrCreateProduct(productKey) {
  if (DRY_RUN) return { id: `prod_DRYRUN_${productKey}` }

  // Find by metadata so re-runs reuse the same product.
  const search = await stripe.products.search({
    query: `metadata['examcore_product']:'${productKey}'`,
    limit: 1,
  })
  if (search.data.length > 0) return search.data[0]

  return stripe.products.create({
    name: DISPLAY_NAMES[productKey],
    metadata: { examcore_product: productKey },
  })
}

async function createPrice({ productId, productKey, currency, amountCents, billingPeriod }) {
  if (DRY_RUN) {
    return { id: `price_DRYRUN_${productKey}_${currency}_${billingPeriod ?? 'once'}` }
  }
  return stripe.prices.create({
    product: productId,
    currency,
    unit_amount: amountCents,
    ...(billingPeriod
      ? { recurring: { interval: billingPeriod === 'yearly' ? 'year' : 'month' } }
      : {}),
    metadata: {
      examcore_product: productKey,
      examcore_billing_period: billingPeriod ?? 'one_time',
    },
  })
}

const FOUNDING_COUPON_ID = 'FOUNDING_MEMBER_50'

async function ensureFoundingCoupon() {
  if (DRY_RUN) {
    console.log(`[DRY RUN] would ensure coupon ${FOUNDING_COUPON_ID}`)
    return
  }
  try {
    await stripe.coupons.retrieve(FOUNDING_COUPON_ID)
    console.log(`Coupon ${FOUNDING_COUPON_ID} already exists.`)
  } catch (err) {
    if (err?.statusCode === 404 || err?.code === 'resource_missing') {
      await stripe.coupons.create({
        id: FOUNDING_COUPON_ID,
        percent_off: 50,
        duration: 'forever',
        name: 'Founding Member 50% Off',
      })
      console.log(`Created coupon ${FOUNDING_COUPON_ID} (50% off, forever).`)
    } else {
      throw err
    }
  }
}

async function deactivateLegacyProducts() {
  if (DRY_RUN) {
    console.log('[DRY RUN] would deactivate pricing_config rows for unlimited')
    return
  }
  const { error } = await supabase
    .from('pricing_config')
    .update({ is_active: false })
    .eq('product_key', 'unlimited')
  if (error) {
    console.error('Failed to deactivate unlimited pricing_config rows:', error.message)
    process.exit(1)
  }
  console.log('Deprecated Unlimited tier in pricing_config (is_active=false).')
}

async function upsertPricingConfig(rows) {
  if (DRY_RUN || rows.length === 0) return
  const { error } = await supabase
    .from('pricing_config')
    .upsert(rows, { onConflict: 'product_key,region_tier,currency,billing_period' })
  if (error) {
    console.error('pricing_config upsert failed:', error.message)
    process.exit(1)
  }
}

// --- Main -------------------------------------------------------------------

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No Stripe/DB writes.\n' : 'Creating Stripe products + prices...\n')

  await ensureFoundingCoupon()
  await deactivateLegacyProducts()

  const output = { createdAt: new Date().toISOString(), dryRun: DRY_RUN, products: {} }
  const pricingRows = []

  const allKeys = [...SUBSCRIPTION_KEYS, ...CREDIT_KEYS]

  for (const productKey of allKeys) {
    const product = await getOrCreateProduct(productKey)
    output.products[productKey] = { stripeProductId: product.id, prices: [] }
    console.log(`Product ${productKey} -> ${product.id}`)

    const tiers = ['A', 'B', 'C']
    for (const tier of tiers) {
      const currencies = CURRENCIES_PER_TIER[tier]
      const isSub = SUBSCRIPTION_KEYS.includes(productKey)
      const periods = isSub ? ['monthly', 'yearly'] : [null]

      for (const period of periods) {
        const usdCents = isSub
          ? PRICING[productKey][tier][period]
          : PRICING[productKey][tier]

        for (const currency of currencies) {
          const amountCents = convert(usdCents, currency)
          const price = await createPrice({
            productId: product.id,
            productKey,
            currency,
            amountCents,
            billingPeriod: period,
          })

          output.products[productKey].prices.push({
            tier,
            currency,
            billingPeriod: period,
            amountCents,
            stripePriceId: price.id,
          })

          pricingRows.push({
            product_key: productKey,
            region_tier: tier,
            currency,
            amount_cents: amountCents,
            stripe_price_id: price.id,
            billing_period: period,
            is_active: true,
          })

          console.log(
            `  ${tier} ${currency} ${period ?? 'one-time'} = ${amountCents} -> ${price.id}`
          )
        }
      }
    }
  }

  await upsertPricingConfig(pricingRows)

  const outPath = join(__dirname, 'stripe-products-output.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${pricingRows.length} price rows. Output -> ${outPath}`)
  if (!DRY_RUN) {
    console.log(
      `Created Scholar + Mastery tiers, deprecated Unlimited tier, seeded ${pricingRows.length} pricing_config rows.`
    )
  }
}

main().catch((err) => {
  console.error('setup-stripe-products failed:', err)
  process.exit(1)
})
