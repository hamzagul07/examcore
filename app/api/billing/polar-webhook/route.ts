import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePolarProduct } from '@/lib/polar/products'
import { notifyPurchaseEmails } from '@/lib/email/notifications'
import { runAfterResponse } from '@/lib/after-response'
import { tierMarketingName } from '@/lib/billing/caps'
import { sendScholarVaultWelcome } from '@/lib/email/scholar-vault-welcome'
import { grantMaxWelcomeGift } from '@/lib/max/gifts'
import { refundedCreditShare } from '@/lib/billing/refund-share'
import type { SubscriptionTier } from '@/lib/database.types'

export const runtime = 'nodejs' // not edge — needs the raw body
export const dynamic = 'force-dynamic'

// The validated event union. We only act on a few types; the rest are ACKed.
type PolarEvent = ReturnType<typeof validateEvent>

/**
 * How long an unfinished claim is assumed to belong to a live request.
 *
 * Comfortably longer than the 300s any billing handler can take (this route has
 * no maxDuration override, so it sits on the platform default well under that),
 * and short enough that a delivery abandoned by a killed invocation is
 * recoverable on one of Polar's retries rather than stuck for good.
 */
const CLAIM_LEASE_MS = 10 * 60 * 1000

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
      // Unsigned requests (bots/scanners probing the public URL) are expected
      // and benign — log at warn so they don't clutter error monitoring. A
      // signature *mismatch* (headers present but invalid) keeps error level,
      // since it can signal misconfiguration or tampering.
      const unsigned = /missing required headers/i.test(err.message)
      const log = unsigned ? console.warn : console.error
      log('[polar-webhook] signature verification failed:', err.message)
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
    // NULL until the handler returns. The column used to default to now() at
    // insert time, which recorded the claim rather than the completion and so
    // could not tell "done" from "started and never finished".
    processed_at: null,
  })

  if (claimError) {
    if (claimError.code === '23505') {
      // Claimed already — but by a finished run, or by one that died?
      //
      // Deleting the claim in the catch below covers a thrown error. It cannot
      // cover termination: when Vercel kills the invocation between the claim
      // and the grant, no catch runs, the row stays, and Polar's retry was
      // being discarded as a duplicate — leaving a paying customer with nothing
      // and no record that it had happened.
      const { data: existing } = await supabase
        .from('polar_webhook_events')
        .select('processed_at, claimed_at')
        .eq('id', eventId)
        .maybeSingle()

      if (existing?.processed_at) {
        return NextResponse.json({ received: true, duplicate: true })
      }

      // Unfinished. Inside the lease window another request is probably still
      // working on it, so ask Polar to come back rather than run it twice.
      const cutoff = new Date(Date.now() - CLAIM_LEASE_MS).toISOString()
      const { data: takenOver } = await supabase
        .from('polar_webhook_events')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', eventId)
        .is('processed_at', null)
        .lt('claimed_at', cutoff)
        .select('id')

      if (!takenOver || takenOver.length === 0) {
        console.warn('[polar-webhook] claim held by a live request:', eventId)
        return NextResponse.json(
          { error: 'Event still processing' },
          { status: 409 }
        )
      }
      // The conditional update is atomic, so exactly one retry wins the takeover
      // and the rest get the 409 above. Fall through and reprocess.
      console.warn('[polar-webhook] recovering an abandoned claim:', eventId)
    } else {
      // Couldn't claim (transient DB error) — 500 so Polar retries.
      console.error('[polar-webhook] claim insert failed:', claimError.message)
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }
  }

  try {
    await handlePolarEvent(event, supabase)
    // Only now is the delivery genuinely done, and only now may a later
    // delivery of the same event be dismissed as a duplicate.
    await supabase
      .from('polar_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventId)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[polar-webhook] processing error:', err)
    // Release the claim so Polar's retry can reprocess.
    //
    // Re-running is safe because every handler below is idempotent in its own
    // right — NOT because a throw proves the side effect never landed. It does
    // not: apply_credit_topup can commit and the `processed_at` stamp on the
    // next line can then fail, and the lease takeover above deliberately re-runs
    // a handler whose invocation was killed at an unknown point. Any new side
    // effect added here needs its own natural key (the credit RPCs key on
    // polar_order_id; the Max gift and Scholar welcome hold ledger claims).
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
): Promise<{ ok: boolean; userId: string | null; tier: SubscriptionTier | null }> {
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
    return { ok: false, userId: null, tier: null }
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

  // null tier = unknown product. The confirmation email falls back to generic
  // copy rather than naming a plan the DB was not given either.
  return { ok: true, userId, tier: resolved?.tier ?? null }
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
      // Purchase greeting only on activation — not on every update/cancel flag flip.
      if (ok && userId && event.type === 'subscription.active') {
        // Max gets grantMaxWelcomeGift (Vault + bonus) — one Day-0 student email.
        // Both paid tiers now send their own Day-0 email, so the generic
        // "your plan is now active" line would be a second, worse message.
        const skipStudentEmail = tier === 'mastery' || tier === 'scholar'
        runAfterResponse('purchase-emails-subscription', () =>
          notifyPurchaseEmails(
            supabase,
            userId,
            {
              kind: 'subscription',
              detail: tier
                ? `Your ${tierMarketingName(tier)} plan is now active.`
                : 'Your plan is now active.',
              tier,
              providerRef: sub.id,
            },
            { skipStudentEmail }
          )
        )
      }
      // Max welcome gift: new Max checkouts fire `subscription.active`; Pro/Scholar
      // → Max upgrades sync via `subscription.updated`. grantMaxWelcomeGift is
      // idempotent per user so both paths are safe.
      if (
        ok &&
        userId &&
        tier === 'mastery' &&
        (event.type === 'subscription.active' || event.type === 'subscription.updated')
      ) {
        runAfterResponse('max-welcome-gift', () =>
          grantMaxWelcomeGift(supabase, userId)
        )
      }
      // Scholar's Day-0: what is already in their Vault, and the two profile
      // fields that decide how much of it they see. Claim-guarded, so a webhook
      // retry cannot mail twice. Only on `.active` — an upgrade into Scholar
      // from Pro is a plan change, not a welcome.
      if (ok && userId && tier === 'scholar' && event.type === 'subscription.active') {
        runAfterResponse('scholar-vault-welcome', () =>
          sendScholarVaultWelcome(supabase, userId, tier)
        )
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
      // Revoke ONLY the subscription this event is about.
      //
      // The update used to match on user_id alone, so it downgraded whatever
      // row was there regardless of which subscription had ended. Cancel Pro,
      // buy Max, and a `subscription.revoked` for the old Pro arriving after the
      // new Max activation reset a paying customer to free. Webhook ordering is
      // not guaranteed and this needs no unusual delay to happen.
      //
      // `null` is allowed through for rows written before polar_subscription_id
      // was recorded; without that, a legacy subscriber could never be revoked.
      // Polar ids are opaque slugs — checked here because the value is
      // interpolated into a PostgREST filter string, where a comma would change
      // the meaning of the expression rather than just fail to match.
      if (!/^[A-Za-z0-9_-]+$/.test(sub.id)) {
        throw new Error(`subscription.revoked: unexpected subscription id ${sub.id}`)
      }
      const { data: revoked, error } = await supabase
        .from('user_subscriptions')
        .update({
          tier: 'free',
          status: 'canceled',
          cancel_at_period_end: false,
          canceled_at: isoOrNull(sub.canceledAt) ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .or(`polar_subscription_id.eq.${sub.id},polar_subscription_id.is.null`)
        .select('user_id')
      if (error) throw new Error(`subscription.revoked update failed: ${error.message}`)
      if (!revoked || revoked.length === 0) {
        // Not an error: the customer holds a different, newer subscription.
        console.warn(
          `[polar-webhook] subscription.revoked ${sub.id}: superseded, access left intact.`
        )
      }
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

      // Atomic balance bump + usage_events log, idempotent on the Polar order id
      // (ux_usage_events_credit_order). NOT on the outer event-id claim: that
      // claim is deleted on a throw and can be taken over after its lease
      // expires, so the handler must assume it may run twice for one order.
      //
      // try_apply_credit_topup is the same operation returning whether THIS call
      // was the one that applied it. The receipt rides on that answer, so a
      // redelivery or a recovered claim re-runs the grant harmlessly and does not
      // send a paying customer a second confirmation for one purchase.
      const { data: applied, error } = await supabase.rpc('try_apply_credit_topup', {
        p_user_id: userId,
        p_credits: resolved.credits,
        p_metadata: {
          polar_order_id: order.id,
          product: resolved.productKey,
        },
      })
      if (error) throw new Error(`try_apply_credit_topup failed: ${error.message}`)
      if (applied === false) {
        // Already credited by an earlier delivery of this order. Nothing to do,
        // and nothing to say to the customer.
        console.warn(
          `[polar-webhook] order.paid ${order.id}: already credited, skipping receipt.`
        )
        break
      }

      runAfterResponse('purchase-emails-credits', () =>
        notifyPurchaseEmails(supabase, userId, {
          kind: 'credits',
          detail: `${resolved.credits} marking credit${resolved.credits === 1 ? '' : 's'} have been added to your account.`,
          credits: resolved.credits,
          providerRef: order.id,
        })
      )
      break
    }

    case 'order.refunded': {
      // Claw back credits when a one-time credit pack is refunded. Subscription
      // refunds are handled by subscription.revoked (access), not here.
      //
      // The reversal is now proportional to the money actually returned. It used
      // to remove the whole pack on any refund, so a 10% goodwill refund on a
      // 500-credit pack took up to 500 credits — the customer paid for 450 and
      // kept none of them. Spent credits still can't be reclaimed; the RPC
      // floors the balance at zero.
      const order = event.data as unknown as {
        id: string
        productId: string | null
        customerId: string
        customer?: { externalId?: string | null } | null
        metadata?: Record<string, unknown> | null
        refundedAmount?: number | null
        totalAmount?: number | null
        amount?: number | null
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

      const creditsToReverse = refundedCreditShare(
        resolved.credits,
        order.refundedAmount,
        order.totalAmount ?? order.amount
      )
      if (creditsToReverse <= 0) {
        console.warn(
          `[polar-webhook] order.refunded ${order.id}: refund too small to reverse a credit.`
        )
        break
      }

      const { error } = await supabase.rpc('apply_credit_refund', {
        p_user_id: userId,
        p_credits: creditsToReverse,
        p_metadata: {
          polar_order_id: order.id,
          product: resolved.productKey,
          reason: 'refund',
          pack_credits: resolved.credits,
          refunded_amount: order.refundedAmount ?? null,
          order_amount: order.totalAmount ?? order.amount ?? null,
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
