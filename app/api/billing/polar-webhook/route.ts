import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePolarProduct } from '@/lib/polar/products'
import { notifyPurchaseEmails } from '@/lib/email/notifications'

export const runtime = 'nodejs' // not edge — needs the raw body
export const dynamic = 'force-dynamic'

// The validated event union. We only act on a few types; the rest are ACKed.
type PolarEvent = ReturnType<typeof validateEvent>

export async function POST(req: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) {
    console.error('[polar-webhook] POLAR_WEBHOOK_SECRET is not set')
    return new NextResponse('Webhook not configured', { status: 500 })
  }

  const body = await req.text() // raw body for signature verification
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })

  let event: PolarEvent
  try {
    event = validateEvent(body, headers, secret)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error('[polar-webhook] signature verification failed:', err.message)
      return new NextResponse('Invalid signature', { status: 403 })
    }
    console.error('[polar-webhook] failed to parse event:', err)
    return new NextResponse('Invalid payload', { status: 400 })
  }

  // Idempotency key: the standard-webhooks delivery id. Signature verification
  // requires this header, so a validated event always has it.
  const eventId = headers['webhook-id']
  if (!eventId) {
    console.error('[polar-webhook] missing webhook-id header after validation')
    return new NextResponse('Missing webhook id', { status: 400 })
  }
  const supabase = createServiceClient()

  // CLAIM the event id atomically BEFORE any side effects. The primary-key
  // insert is atomic, so concurrent or retried duplicate deliveries of the same
  // event can never both proceed — a unique violation means it's already owned.
  // This closes the check-then-act race of the old select-then-insert, which
  // could double-apply non-idempotent side effects like credit top-ups.
  const { error: claimError } = await supabase.from('polar_webhook_events').insert({
    id: eventId,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })

  if (claimError) {
    if (claimError.code === '23505') {
      // Already claimed/processed — duplicate delivery.
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Couldn't claim (transient DB error) — 500 so Polar retries.
    console.error('[polar-webhook] claim insert failed:', claimError.message)
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }

  try {
    await handlePolarEvent(event, supabase)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[polar-webhook] processing error:', err)
    // Release the claim so Polar's retry can reprocess. Each event performs a
    // single atomic side effect, so re-running after a thrown error is safe
    // (the throw means the side effect had not been applied).
    await supabase.from('polar_webhook_events').delete().eq('id', eventId)
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoOrNull(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null
}

async function findUserIdByPolarCustomer(
  supabase: SupabaseClient,
  polarCustomerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('polar_customer_id', polarCustomerId)
    .maybeSingle()
  return data?.user_id ?? null
}

/**
 * Resolve the Supabase user for an event. Prefer the customer's externalId
 * (set to user.id at checkout), then checkout/order metadata, then a lookup by
 * the cached polar_customer_id.
 */
async function resolveUserId(
  supabase: SupabaseClient,
  opts: {
    externalId?: string | null
    metadataUserId?: string | null
    polarCustomerId?: string | null
  }
): Promise<string | null> {
  if (opts.externalId) return opts.externalId
  if (opts.metadataUserId) return opts.metadataUserId
  if (opts.polarCustomerId) {
    return findUserIdByPolarCustomer(supabase, opts.polarCustomerId)
  }
  return null
}

type PolarSubscription = {
  id: string
  status: string
  productId: string
  customerId: string
  customer?: { externalId?: string | null } | null
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
  canceledAt?: Date | null
  metadata?: Record<string, unknown> | null
}

async function syncSubscription(
  supabase: SupabaseClient,
  sub: PolarSubscription
): Promise<{ ok: boolean; userId: string | null; tier: string }> {
  const userId = await resolveUserId(supabase, {
    externalId: sub.customer?.externalId,
    metadataUserId:
      typeof sub.metadata?.supabase_user_id === 'string'
        ? (sub.metadata.supabase_user_id as string)
        : null,
    polarCustomerId: sub.customerId,
  })
  if (!userId) {
    console.warn(
      `[polar-webhook] subscription ${sub.id}: no resolvable user (customer ${sub.customerId}). Skipping.`
    )
    return { ok: false, userId: null, tier: 'free' }
  }

  const resolved = resolvePolarProduct(sub.productId)
  if (!resolved) {
    console.warn(
      `[polar-webhook] subscription ${sub.id}: unknown product ${sub.productId}. Tier defaults to free.`
    )
  }

  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      polar_customer_id: sub.customerId,
      polar_subscription_id: sub.id,
      tier: resolved?.tier ?? 'free',
      status: sub.status,
      billing_period: resolved?.billingPeriod ?? null,
      current_period_start: isoOrNull(sub.currentPeriodStart),
      current_period_end: isoOrNull(sub.currentPeriodEnd),
      cancel_at_period_end: sub.cancelAtPeriodEnd ?? false,
      canceled_at: isoOrNull(sub.canceledAt),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`syncSubscription upsert failed: ${error.message}`)

  return { ok: true, userId, tier: resolved?.tier ?? 'paid' }
}

async function handlePolarEvent(event: PolarEvent, supabase: SupabaseClient) {
  switch (event.type) {
    // Sync group: every lifecycle change that KEEPS the subscription mapped to a
    // tier. Crucially `subscription.canceled` belongs here — for a cancel at
    // period end Polar fires it immediately while the customer keeps access
    // until current_period_end (status stays `active`, cancel_at_period_end
    // true). syncSubscription records that faithfully; access is only removed
    // by `subscription.revoked` below. `past_due` keeps access during dunning
    // (see effectiveAccess); `uncanceled` clears the pending cancellation.
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.canceled':
    case 'subscription.uncanceled':
    case 'subscription.past_due': {
      const sub = event.data as unknown as PolarSubscription
      const { ok, userId, tier } = await syncSubscription(supabase, sub)
      // Only greet on activation, not on every update.
      if (ok && userId && event.type === 'subscription.active') {
        void notifyPurchaseEmails(supabase, userId, {
          kind: 'subscription',
          detail: `Your ${tier} plan is now active.`,
          stripeSessionId: sub.id,
        })
      }
      break
    }

    case 'subscription.revoked': {
      // Access ends now: at period end for a scheduled cancel, or immediately
      // for a revoke / final dunning failure.
      const sub = event.data as unknown as PolarSubscription
      const userId = await resolveUserId(supabase, {
        externalId: sub.customer?.externalId,
        metadataUserId:
          typeof sub.metadata?.supabase_user_id === 'string'
            ? (sub.metadata.supabase_user_id as string)
            : null,
        polarCustomerId: sub.customerId,
      })
      if (!userId) {
        console.warn(
          `[polar-webhook] subscription.revoked ${sub.id}: no resolvable user. Skipping.`
        )
        break
      }
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          tier: 'free',
          status: 'canceled',
          cancel_at_period_end: false,
          canceled_at: isoOrNull(sub.canceledAt) ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      if (error) throw new Error(`subscription.revoked update failed: ${error.message}`)
      break
    }

    case 'order.paid': {
      // Covers subscription invoices AND one-time credit purchases. Subscription
      // tier is handled by subscription.* events, so here we only act on credit
      // packs (one-time products).
      const order = event.data as unknown as {
        id: string
        productId: string | null
        customerId: string
        subscriptionId: string | null
        customer?: { externalId?: string | null } | null
        metadata?: Record<string, unknown> | null
      }

      if (!order.productId) break
      const resolved = resolvePolarProduct(order.productId)
      if (!resolved || resolved.isSubscription) break // credits only here
      if (resolved.credits <= 0) break

      const userId = await resolveUserId(supabase, {
        externalId: order.customer?.externalId,
        metadataUserId:
          typeof order.metadata?.supabase_user_id === 'string'
            ? (order.metadata.supabase_user_id as string)
            : null,
        polarCustomerId: order.customerId,
      })
      if (!userId) {
        console.warn(
          `[polar-webhook] order.paid ${order.id}: no resolvable user. Skipping.`
        )
        break
      }

      // Atomic balance bump + usage_events log. Idempotency guaranteed by the
      // outer event-id dedup.
      const { error } = await supabase.rpc('apply_credit_topup', {
        p_user_id: userId,
        p_credits: resolved.credits,
        p_metadata: {
          polar_order_id: order.id,
          product: resolved.productKey,
        },
      })
      if (error) throw new Error(`apply_credit_topup failed: ${error.message}`)

      void notifyPurchaseEmails(supabase, userId, {
        kind: 'credits',
        detail: `${resolved.credits} marking credit${resolved.credits === 1 ? '' : 's'} have been added to your account.`,
        stripeSessionId: order.id,
      })
      break
    }

    case 'order.refunded': {
      // Claw back credits when a one-time credit pack is refunded. Subscription
      // refunds are handled by subscription.revoked (access), not here. Partial
      // refunds still claw back the full pack (floored at the current balance);
      // spent credits can't be reclaimed.
      const order = event.data as unknown as {
        id: string
        productId: string | null
        customerId: string
        customer?: { externalId?: string | null } | null
        metadata?: Record<string, unknown> | null
      }

      if (!order.productId) break
      const resolved = resolvePolarProduct(order.productId)
      if (!resolved || resolved.isSubscription || resolved.credits <= 0) break

      const userId = await resolveUserId(supabase, {
        externalId: order.customer?.externalId,
        metadataUserId:
          typeof order.metadata?.supabase_user_id === 'string'
            ? (order.metadata.supabase_user_id as string)
            : null,
        polarCustomerId: order.customerId,
      })
      if (!userId) {
        console.warn(
          `[polar-webhook] order.refunded ${order.id}: no resolvable user. Skipping.`
        )
        break
      }

      const { error } = await supabase.rpc('apply_credit_refund', {
        p_user_id: userId,
        p_credits: resolved.credits,
        p_metadata: {
          polar_order_id: order.id,
          product: resolved.productKey,
          reason: 'refund',
        },
      })
      if (error) throw new Error(`apply_credit_refund failed: ${error.message}`)
      break
    }

    default:
      if (process.env.NODE_ENV !== 'production') {
        console.log('[polar-webhook] unhandled type:', event.type)
      }
  }
}
