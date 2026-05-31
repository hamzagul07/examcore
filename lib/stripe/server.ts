import Stripe from 'stripe'

// Lazy initialization. We must NOT touch STRIPE_SECRET_KEY at module load:
// Next.js imports every API route during `next build` to collect page data, and
// the key is legitimately absent until the Stripe setup is run in production.
// Throwing at import time crashes the build ("Failed to collect page data").
// Instead we create the client on first use, so a missing key only errors when
// a billing endpoint is actually hit.
let cachedStripe: Stripe | null = null

export function getStripe(): Stripe {
  if (cachedStripe) return cachedStripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Set it in environment variables before using Stripe features.'
    )
  }

  cachedStripe = new Stripe(key, {
    // apiVersion pinned to the literal the installed `stripe` package ships
    // with — its TS types only accept its own bundled version. Bump this
    // together with the `stripe` dependency.
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  })

  return cachedStripe
}

// Backwards compat: existing callers do `import { stripe } from '@/lib/stripe/server'`
// and then `stripe.checkout.sessions.create(...)`. The Proxy defers to
// getStripe() on first property access, so those call sites keep working
// unchanged while remaining lazy (no client created until a property is read).
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripe() as object, prop)
  },
})
