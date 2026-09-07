#!/usr/bin/env node
/**
 * One-time Polar product creation (replaces scripts/setup-stripe-products.mjs).
 *
 * Run AFTER setting POLAR_ACCESS_TOKEN in .env.local:
 *   node scripts/setup-polar-products.mjs --dry-run          # print plan, no writes
 *   node scripts/setup-polar-products.mjs --only=student     # one product family
 *   node scripts/setup-polar-products.mjs --yes-production   # required on production
 *
 * ⚠ `--only` matters more than it looks. Without it this touches all nine
 * products, and for ones that already exist it calls products.update(), which
 * ARCHIVES the live price and attaches a new one. `scholar` and `mastery` have
 * real subscribers on them; re-pricing those to apply a change to `student`
 * would be an unforced error. Pass --only=student when Starter is what changed.
 *
 * ⚠ POLAR_SERVER decides which Polar you are writing to, and it defaults to
 * `sandbox`. Product IDs from sandbox are meaningless in production and vice
 * versa, so check the banner the script prints before pasting anything.
 *
 * What it does:
 *   1. Creates one Polar product per (subscription tier x billing period) and
 *      one per credit pack — 9 products total, priced in USD.
 *   2. Idempotency: looks up existing products by our `examcore_product` +
 *      `examcore_billing_period` metadata and REUSES them instead of duplicating.
 *   3. Prints env-ready POLAR_PRODUCT_* lines to paste into .env.local, and
 *      writes scripts/polar-products-output.json for record-keeping.
 *
 * Polar products are single-interval, so monthly and yearly are separate
 * products. Entitlements are granted by our webhook (no Polar "Benefits").
 */

import { Polar } from '@polar-sh/sdk'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')
const YES_PRODUCTION = process.argv.includes('--yes-production')

/**
 * Which product families to touch. Empty = all of them, which is only right on
 * a first run against an empty organisation.
 */
const ONLY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--only='))
  if (!arg) return null
  const keys = arg
    .slice('--only='.length)
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  return keys.length ? new Set(keys) : null
})()

const selected = (key) => !ONLY || ONLY.has(key)

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

// --- Product definitions (USD cents) ---------------------------------------
// Mirrors the previous tier-A pricing. Single price per product; Polar (MoR)
// presents it in the buyer's local currency at checkout.

// Marketing: Starter / Scholar / Max. `student` carries Starter (was Pro).
// Annual list = 10× monthly. Amounts in USD cents.
const SUBSCRIPTIONS = [
  { key: 'student', name: 'MarkScheme Starter', monthly: 599, yearly: 5990 },
  { key: 'scholar', name: 'MarkScheme Scholar', monthly: 1999, yearly: 19900 },
  { key: 'mastery', name: 'MarkScheme Max', monthly: 3500, yearly: 35000 },
]

const CREDITS = [
  { key: 'credits_25', name: 'MarkScheme Credits 25', amount: 1000 },
  { key: 'credits_100', name: 'MarkScheme Credits 100', amount: 3000 },
  { key: 'credits_500', name: 'MarkScheme Credits 500', amount: 10000 },
]

// Maps (productKey, billingPeriod) -> the env var name the app reads.
const ENV_NAME = {
  'student:monthly': 'POLAR_PRODUCT_STUDENT_MONTHLY',
  'student:yearly': 'POLAR_PRODUCT_STUDENT_YEARLY',
  'scholar:monthly': 'POLAR_PRODUCT_SCHOLAR_MONTHLY',
  'scholar:yearly': 'POLAR_PRODUCT_SCHOLAR_YEARLY',
  'mastery:monthly': 'POLAR_PRODUCT_MASTERY_MONTHLY',
  'mastery:yearly': 'POLAR_PRODUCT_MASTERY_YEARLY',
  'credits_25:one_time': 'POLAR_PRODUCT_CREDITS_25',
  'credits_100:one_time': 'POLAR_PRODUCT_CREDITS_100',
  'credits_500:one_time': 'POLAR_PRODUCT_CREDITS_500',
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

const server =
  process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
const polar = new Polar({
  accessToken: requireEnv('POLAR_ACCESS_TOKEN'),
  server,
})

// Build a lookup of already-created products keyed by our metadata so re-runs
// reuse products instead of creating duplicates.
async function loadExisting() {
  const found = new Map() // `${productKey}:${period}` -> product id
  const iterator = await polar.products.list({ limit: 100 })
  for await (const page of iterator) {
    const items = page.result?.items ?? []
    for (const p of items) {
      const md = p.metadata ?? {}
      const productKey = md.examcore_product
      const period = md.examcore_billing_period
      if (productKey && period) found.set(`${productKey}:${period}`, p.id)
    }
  }
  return found
}

async function ensureProduct({ productKey, name, period, amountCents }, existing) {
  const lookupKey = `${productKey}:${period}`
  const existingId = existing.get(lookupKey)
  if (existingId) {
    // Update name + price in place so re-runs apply new pricing (product id and
    // recurring interval stay the same, so env vars remain valid). Polar
    // archives the old price and attaches the new fixed one.
    if (DRY_RUN) {
      console.log(`  [DRY RUN] would update ${lookupKey} -> ${existingId} (${amountCents} usd)`)
      return existingId
    }
    await polar.products.update({
      id: existingId,
      productUpdate: {
        name,
        prices: [{ amountType: 'fixed', priceAmount: amountCents, priceCurrency: 'usd' }],
      },
    })
    console.log(`  update ${lookupKey} -> ${existingId} (${amountCents} usd)`)
    return existingId
  }
  if (DRY_RUN) {
    console.log(`  [DRY RUN] would create ${lookupKey} (${amountCents} usd)`)
    return `prod_DRYRUN_${productKey}_${period}`
  }

  const base = {
    name,
    prices: [
      { amountType: 'fixed', priceAmount: amountCents, priceCurrency: 'usd' },
    ],
    metadata: {
      examcore_product: productKey,
      examcore_billing_period: period,
    },
  }
  const created =
    period === 'one_time'
      ? await polar.products.create(base)
      : await polar.products.create({
          ...base,
          recurringInterval: period === 'yearly' ? 'year' : 'month',
        })
  console.log(`  create ${lookupKey} -> ${created.id} (${amountCents} usd)`)
  return created.id
}

async function main() {
  // Loud, because the two ways to get this wrong are both silent: writing to
  // the wrong Polar, and re-pricing a product somebody is subscribed to.
  console.log('='.repeat(64))
  console.log(`  Polar server : ${server.toUpperCase()}${DRY_RUN ? '  [DRY RUN — no writes]' : ''}`)
  console.log(`  Touching     : ${ONLY ? [...ONLY].join(', ') : 'ALL 9 PRODUCTS'}`)
  console.log('='.repeat(64) + '\n')

  if (server === 'production' && !DRY_RUN && !YES_PRODUCTION) {
    console.error(
      'Refusing to write to PRODUCTION without --yes-production.\n' +
        'Re-run with --dry-run first, check the plan, then add --yes-production.'
    )
    process.exit(1)
  }

  if (!ONLY && !DRY_RUN) {
    console.warn(
      '⚠ No --only filter: existing products will be UPDATED, which archives\n' +
        '  their current price and attaches a new one. If anyone is subscribed\n' +
        '  to scholar or mastery, pass --only=student instead.\n'
    )
  }

  // Listing is a read, so a dry run does it too. It used to skip the lookup and
  // therefore reported "would create" for every product — including ones that
  // already exist and would in fact be UPDATED, archiving their live price.
  // A preview that cannot tell those two apart is worse than none, because the
  // dangerous case is the one it hid.
  const existing = await loadExisting()
  const envLines = {}
  const output = { createdAt: new Date().toISOString(), server, dryRun: DRY_RUN, products: {} }

  for (const sub of SUBSCRIPTIONS) {
    if (!selected(sub.key)) continue
    console.log(`Subscription: ${sub.key}`)
    for (const period of ['monthly', 'yearly']) {
      const id = await ensureProduct(
        {
          productKey: sub.key,
          name: `${sub.name} (${period === 'yearly' ? 'Yearly' : 'Monthly'})`,
          period,
          amountCents: sub[period],
        },
        existing
      )
      envLines[ENV_NAME[`${sub.key}:${period}`]] = id
      output.products[`${sub.key}_${period}`] = { id, amountCents: sub[period] }
    }
  }

  for (const credit of CREDITS) {
    if (!selected(credit.key)) continue
    console.log(`Credit pack: ${credit.key}`)
    const id = await ensureProduct(
      {
        productKey: credit.key,
        name: credit.name,
        period: 'one_time',
        amountCents: credit.amount,
      },
      existing
    )
    envLines[ENV_NAME[`${credit.key}:one_time`]] = id
    output.products[credit.key] = { id, amountCents: credit.amount }
  }

  // A filtered run holds only the products it touched, so it is written beside
  // the full record rather than replacing it — otherwise `--only=student` would
  // erase the ids of everything else from the file.
  const outPath = join(
    __dirname,
    ONLY ? `polar-products-output.${[...ONLY].join('-')}.json` : 'polar-products-output.json'
  )
  writeFileSync(outPath, JSON.stringify(output, null, 2))

  console.log('\n--- Paste these into .env.local ---\n')
  for (const [name, id] of Object.entries(envLines)) {
    console.log(`${name}=${id}`)
  }
  console.log(`\nWrote record to ${outPath}`)
}

main().catch((err) => {
  console.error('setup-polar-products failed:', err)
  process.exit(1)
})
