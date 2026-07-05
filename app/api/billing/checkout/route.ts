import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { polar } from '@/lib/polar/server'
import {
  type ProductKey,
  creditsForProduct,
  isCreditProduct,
  isSubscriptionProduct,
} from '@/lib/billing/pricing'
import { polarProductId, subscriptionRank } from '@/lib/polar/products'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { resolveSiteUrl } from '@/lib/site-url'
import type { BillingPeriod } from '@/lib/database.types'

// A customer can hold only one Polar subscription, so switching plans (upgrade /
// downgrade / monthly<->yearly) must UPDATE the existing subscription rather than
// open a new checkout (Polar rejects a second one). These statuses mean there's a
// live Polar subscription to switch.
const LIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due'])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_PRODUCTS: ProductKey[] = [
  'student',
  'scholar',
  'mastery',
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
  return req.headers.get('origin') || resolveSiteUrl() || new URL(req.url).origin
}

export async function POST(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)
  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
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

  const productId = polarProductId(product, billingPeriod)
  if (!productId) {
    // Soft-launch case: the POLAR_PRODUCT_* env var isn't set. Structured
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

  const origin = appOrigin(req)
  const returnPath = sanitizeNextPath(body.return_url, '/account')
  const successUrl = `${origin}${returnPath}?checkout=success`

  // First-time subscribers get a 7-day free trial at checkout. Anyone with a
  // polar_subscription_id (even a canceled one) has subscribed before, so no
  // second trial via cancel-and-resubscribe.
  let firstSubscription = false

  // Plan switch: if the user already has a live Polar subscription, update it in
  // place instead of creating a second checkout (which Polar rejects). Trial
  // users have no Polar subscription yet (polar_subscription_id is null), so they
  // fall through to normal checkout.
  if (isSubscriptionProduct(product)) {
    const service = createServiceClient()
    const { data: current } = await service
      .from('user_subscriptions')
      .select('polar_subscription_id, status, tier, billing_period')
      .eq('user_id', user.id)
      .maybeSingle()

    firstSubscription = !current?.polar_subscription_id

    if (
      current?.polar_subscription_id &&
      LIVE_SUB_STATUSES.has(current.status)
    ) {
      // No-op if they picked the exact plan they're already on.
      const currentProductId = polarProductId(
        current.tier as ProductKey,
        current.billing_period as BillingPeriod | null
      )
      if (currentProductId === productId) {
        return jsonWithAuthCookies(
          { url: `${origin}${returnPath}?checkout=success` },
          pendingCookies
        )
      }

      // Downgrades defer to the end of the current period (the user keeps the
      // plan they paid for, no mid-cycle credit); upgrades apply immediately
      // with a prorated charge.
      const isDowngrade =
        subscriptionRank(product, billingPeriod) <
        subscriptionRank(
          current.tier as ProductKey,
          current.billing_period as BillingPeriod | null
        )
      const prorationBehavior = isDowngrade ? 'next_period' : 'invoice'

      try {
        await polar.subscriptions.update({
          id: current.polar_subscription_id,
          subscriptionUpdate: { productId, prorationBehavior },
        })
        // Upgrades: the subscription.updated webhook syncs the new tier now.
        // Downgrades: a pending_update is scheduled; the tier flips when the
        // webhook fires at period end. Either way redirect to billing.
        const scheduled = isDowngrade ? '&scheduled=1' : ''
        return jsonWithAuthCookies(
          { url: `${origin}${returnPath}?checkout=success${scheduled}`, scheduled: isDowngrade },
          pendingCookies
        )
      } catch (err) {
        console.error('[billing/checkout] Polar subscription update failed:', err)
        return NextResponse.json(
          { error: 'Could not change your plan. Try again in a moment.' },
          { status: 502 }
        )
      }
    }
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      // The Polar↔Supabase link. Polar creates/links the customer to this id.
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      successUrl,
      // 7-day free trial on the first paid subscription only (card collected,
      // charged when the trial ends). Credit packs are one-time — no trial.
      ...(firstSubscription
        ? { trialInterval: 'day' as const, trialIntervalCount: 7 }
        : {}),
      // Carry the link on the checkout so the webhook can credit reliably.
      metadata: {
        supabase_user_id: user.id,
        product,
        ...(isCreditProduct(product)
          ? { credits: String(creditsForProduct(product)) }
          : {}),
      },
    })

    return jsonWithAuthCookies({ url: checkout.url }, pendingCookies)
  } catch (err) {
    console.error('[billing/checkout] Polar checkout creation failed:', err)
    return NextResponse.json(
      { error: 'Could not start checkout. Try again in a moment.' },
      { status: 502 }
    )
  }
}
