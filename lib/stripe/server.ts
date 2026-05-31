import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

// apiVersion pinned to the literal the installed `stripe` package (v22.2.0)
// ships with. The spec suggested '2025-01-27.acacia', but this SDK's TS types
// only accept its own bundled version, so we pin to that to keep the build
// green. Bump this together with the `stripe` dependency.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
})
