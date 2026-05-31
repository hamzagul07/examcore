import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe/server'
import { getOrCreateStripeCustomer } from '@/lib/billing/customer'
import {
  type ProductKey,
  creditsForProduct,
  isCreditProduct,
  isSubscriptionProduct,
  resolvePrice,
  FOUNDING_MEMBER_COUPON,
} from '@/lib/billing/pricing'
import { resolveRegion, REGION_COOKIE } from '@/lib/billing/region-cookie'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import type { BillingPeriod } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PRODUCTS: ProductKey[] = [
  'student',
  'unlimited',
  'credits_25',
  'credits_100',
  'credits_500',
]

type Body = {
  product?: string
  billing_period?: string
  return_url?: string
}

function appOrigin(req: NextRequest): string {
  return (
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(req.url).origin
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const product = body.product as ProductKey
  if (!product || !VALID_PRODUCTS.includes(product)) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
  }

  const billingPeriod: BillingPeriod | null = isSubscriptionProduct(product)
    ? body.billing_period === 'yearly'
      ? 'yearly'
      : 'monthly'
    : null

  // Region: explicit cookie override wins, else Vercel geo header.
  const region = resolveRegion(
    req.cookies.get(REGION_COOKIE)?.value,
    req.headers.get('x-vercel-ip-country')
  )
  const service = createServiceClient()

  const price = await resolvePrice(service, {
    product,
    regionTier: region.tier,
    currency: region.currency,
    billingPeriod,
  })
  if (!price) {
    // Soft-launch case: setup script hasn't seeded pricing_config. Structured
    // response so the client can show a friendly "setup in progress" message.
    return NextResponse.json(
      {
        error: 'pricing_not_configured',
        message: 'Subscription setup is in progress. Please check back shortly.',
        retry: true,
      },
      { status: 503 }
    )
  }

  // Founding members get a permanent 50% off via the Stripe coupon.
  const { data: subRow } = await service
    .from('user_subscriptions')
    .select('founding_member')
    .eq('user_id', user.id)
    .maybeSingle()
  const isFounding = Boolean(subRow?.founding_member)

  let customerId: string
  try {
    customerId = await getOrCreateStripeCustomer(service, {
      id: user.id,
      email: user.email,
    })
  } catch (err) {
    console.error('[billing/checkout] customer creation failed:', err)
    return NextResponse.json(
      { error: 'Could not start checkout. Try again in a moment.' },
      { status: 502 }
    )
  }

  const origin = appOrigin(req)
  const returnPath = sanitizeNextPath(body.return_url, '/account')
  const successUrl = `${origin}${returnPath}?checkout=success`
  const cancelUrl = `${origin}${returnPath}?checkout=cancel`

  try {
    const isSub = isSubscriptionProduct(product)
    const session = await stripe.checkout.sessions.create({
      mode: isSub ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price: price.stripe_price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Carry the link on the session so the webhook can credit reliably even
      // before customer.subscription.* arrives.
      metadata: {
        supabase_user_id: user.id,
        product,
        ...(isCreditProduct(product)
          ? { credits: String(creditsForProduct(product)) }
          : {}),
      },
      ...(isSub
        ? { subscription_data: { metadata: { supabase_user_id: user.id } } }
        : {}),
      // Apply the founding-member coupon when present. If the coupon doesn't
      // exist yet (script not run), Stripe rejects it — caught below as a
      // generic checkout error, so create the coupon via the setup script.
      ...(isFounding ? { discounts: [{ coupon: FOUNDING_MEMBER_COUPON }] } : {}),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/checkout] session creation failed:', err)
    return NextResponse.json(
      { error: 'Could not start checkout. Try again in a moment.' },
      { status: 502 }
    )
  }
}
