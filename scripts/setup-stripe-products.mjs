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
 * before creation. Subscription rows upsert on (product_key, region_tier,
 * currency, billing_period). Credit packs use billing_period=null — Postgres
 * treats NULL as distinct in UNIQUE, so credit re-runs deactivate prior active
 * rows explicitly before inserting the new price (see deactivatePriorCreditPricing).
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
// Keep in sync with lib/billing/pricing-usd.ts

const PRICING = {
  student: {
    A: { monthly: 1800, yearly: 15800 }, // $18 / $158
    B: { monthly: 1000, yearly: 9000 }, // $10 / $90
    C: { monthly: 600, yearly: 5000 }, // $6 / $50
  },
  scholar: {
    A: { monthly: 3800, yearly: 29800 }, // $38 / $298
    B: { monthly: 2200, yearly: 17800 }, // $22 / $178
    C: { monthly: 1400, yearly: 11000 }, // $14 / $110
  },
  mastery: {
    A: { monthly: 7800, yearly: 65800 }, // $78 / $658
    B: { monthly: 4400, yearly: 37800 }, // $44 / $378
    C: { monthly: 3000, yearly: 25800 }, // $30 / $258
  },
  credits_25: { A: 1000, B: 600, C: 400 },
  credits_100: { A: 3000, B: 1800, C: 1200 },
  credits_500: { A: 10000, B: 6000, C: 4000 },
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
  student: 'MarkScheme Student',
  scholar: 'MarkScheme Scholar',
  mastery: 'MarkScheme Mastery',
  credits_25: 'MarkScheme Credits 25',
  credits_100: 'MarkScheme Credits 100',
  credits_500: 'MarkScheme Credits 500',
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

async function deactivatePriorCreditPricing(productKey, regionTier, currency) {
  if (DRY_RUN) {
    console.log(
      `[DRY RUN] would deactivate prior active ${productKey} ${regionTier} ${currency} (billing_period IS NULL)`
    )
    return
  }
  // Credit packs store billing_period=null. Postgres UNIQUE treats each NULL as
  // distinct (unless NULLS NOT DISTINCT), so upsert on that column never
  // merges re-runs — deactivating first guarantees one active row per combo.
  const { error } = await supabase
    .from('pricing_config')
    .update({ is_active: false })
    .eq('product_key', productKey)
    .eq('region_tier', regionTier)
    .eq('currency', currency)
    .is('billing_period', null)
    .eq('is_active', true)
  if (error) {
    console.error('deactivatePriorCreditPricing failed:', error.message)
    process.exit(1)
  }
}

async function upsertPricingConfig(rows) {
  if (DRY_RUN || rows.length === 0) return

  const subscriptionRows = rows.filter((r) => r.billing_period != null)
  const creditRows = rows.filter((r) => r.billing_period == null)

  if (subscriptionRows.length > 0) {
    const { error } = await supabase
      .from('pricing_config')
      .upsert(subscriptionRows, {
        onConflict: 'product_key,region_tier,currency,billing_period',
      })
    if (error) {
      console.error('pricing_config subscription upsert failed:', error.message)
      process.exit(1)
    }
  }

  // Insert (not upsert): NULL billing_period never conflicts on the unique key.
  for (const row of creditRows) {
    const { error } = await supabase.from('pricing_config').insert(row)
    if (error) {
      console.error('pricing_config credit insert failed:', error.message)
      process.exit(1)
    }
  }
}

// --- Main -------------------------------------------------------------------

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No Stripe/DB writes.\n' : 'Creating Stripe products + prices...\n')

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

          if (!isSub) {
            await deactivatePriorCreditPricing(productKey, tier, currency)
          }

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
