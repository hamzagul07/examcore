#!/usr/bin/env node
/**
 * One-time Polar product creation (replaces scripts/setup-stripe-products.mjs).
 *
 * Run AFTER setting POLAR_ACCESS_TOKEN (sandbox) in .env.local:
 *   node scripts/setup-polar-products.mjs
 *   node scripts/setup-polar-products.mjs --dry-run   # print plan, no writes
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

const SUBSCRIPTIONS = [
  { key: 'student', name: 'MarkScheme Student', monthly: 3300, yearly: 25900 },
  { key: 'scholar', name: 'MarkScheme Scholar', monthly: 3300, yearly: 25900 },
  { key: 'mastery', name: 'MarkScheme Mastery', monthly: 6250, yearly: 49100 },
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
    console.log(`  reuse ${lookupKey} -> ${existingId}`)
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
  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}Setting up Polar products on "${server}"...\n`
  )

  const existing = DRY_RUN ? new Map() : await loadExisting()
  const envLines = {}
  const output = { createdAt: new Date().toISOString(), server, dryRun: DRY_RUN, products: {} }

  for (const sub of SUBSCRIPTIONS) {
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

  const outPath = join(__dirname, 'polar-products-output.json')
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
