import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { createServiceClient } from '@/lib/supabase/service'
import { lookupPriceConfig } from '@/lib/billing/pricing'

export const runtime = 'nodejs' // not edge — needs the raw body
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new NextResponse('Missing signature', { status: 400 })

  const body = await req.text() // raw body for signature verification

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('Webhook signature verification failed:', message)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  const supabase = createServiceClient()

  // IDEMPOTENCY: bail if we've already processed this event id.
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle()

  if (existing) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Webhook already processed:', event.id)
    }
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await handleStripeEvent(event, supabase)

    // Record successful processing AFTER the side effects succeeded, so a crash
    // mid-processing leaves no record and Stripe's retry can re-run it.
    await supabase.from('stripe_webhook_events').insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Return 500 so Stripe retries (transient DB/Stripe failure).
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function unixToIso(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null
}

/**
 * Period dates moved from the Subscription onto its items in recent Stripe API
 * versions (the pinned `2026-05-27.dahlia`). Read item-level first, then fall
 * back to the legacy top-level fields for safety across versions.
 */
function periodFromSubscription(sub: Stripe.Subscription): {
  start: string | null
  end: string | null
} {
  const item = sub.items?.data?.[0] as unknown as
    | { current_period_start?: number; current_period_end?: number }
    | undefined
  const legacy = sub as unknown as {
    current_period_start?: number
    current_period_end?: number
  }
  return {
    start: unixToIso(item?.current_period_start ?? legacy.current_period_start),
    end: unixToIso(item?.current_period_end ?? legacy.current_period_end),
  }
}

async function findUserIdByCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.user_id ?? null
}

/**
 * Upsert a user's subscription row from a Stripe.Subscription. Returns false
 * when the customer doesn't map to any Supabase user (orphan) — the caller logs
 * and continues so we still ACK the event (no endless retries).
 */
async function syncSubscription(
  supabase: SupabaseClient,
  sub: Stripe.Subscription
): Promise<boolean> {
  const customerId = customerIdOf(sub.customer)
  if (!customerId) {
    console.warn('Subscription has no customer:', sub.id)
    return false
  }

  const userId = await findUserIdByCustomer(supabase, customerId)
  if (!userId) {
    console.warn(
      `Orphaned Stripe customer ${customerId} (sub ${sub.id}) — no matching Supabase user. Skipping.`
    )
    return false
  }

  const priceId = sub.items?.data?.[0]?.price?.id
  const config = priceId ? await lookupPriceConfig(supabase, priceId) : null
  if (priceId && !config) {
    console.warn(
      `No pricing_config for price ${priceId} (sub ${sub.id}). Tier defaults to free.`
    )
  }

  const { start, end } = periodFromSubscription(sub)

  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      tier: config?.tier ?? 'free',
      status: sub.status,
      billing_period: config?.billing_period ?? null,
      current_period_start: start,
      current_period_end: end,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: unixToIso(sub.canceled_at),
      currency: sub.currency ?? 'usd',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) throw new Error(`syncSubscription upsert failed: ${error.message}`)
  return true
}

async function handleStripeEvent(event: Stripe.Event, supabase: SupabaseClient) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode === 'payment') {
        // One-time credit purchase. Resolve user via metadata first, then
        // fall back to the customer link.
        const customerId = customerIdOf(session.customer)
        const metaUserId = session.metadata?.supabase_user_id ?? null
        const userId =
          metaUserId ??
          (customerId ? await findUserIdByCustomer(supabase, customerId) : null)

        if (!userId) {
          console.warn(
            `checkout.session.completed (payment) ${session.id}: no user resolvable (customer ${customerId}). Skipping.`
          )
          break
        }

        const credits = parseInt(session.metadata?.credits ?? '0', 10)
        if (!Number.isFinite(credits) || credits <= 0) {
          console.warn(
            `checkout.session.completed (payment) ${session.id}: invalid credits metadata "${session.metadata?.credits}". Skipping.`
          )
          break
        }

        // Atomic balance bump + usage_events log (DB function). Idempotency is
        // guaranteed by the outer event-id dedup.
        const { error } = await supabase.rpc('apply_credit_topup', {
          p_user_id: userId,
          p_credits: credits,
          p_metadata: {
            stripe_session_id: session.id,
            product: session.metadata?.product ?? null,
            stripe_event_id: event.id,
          },
        })
        if (error) throw new Error(`apply_credit_topup failed: ${error.message}`)
        break
      }

      if (session.mode === 'subscription' && session.subscription) {
        const subId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        const sub = await stripe.subscriptions.retrieve(subId)
        const ok = await syncSubscription(supabase, sub)
        if (!ok) console.warn(`checkout.session.completed (sub) ${session.id}: orphan/no-op.`)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const ok = await syncSubscription(supabase, sub)
      if (!ok) console.warn(`${event.type} ${sub.id}: orphan/no-op.`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = customerIdOf(sub.customer)
      if (!customerId) break
      const userId = await findUserIdByCustomer(supabase, customerId)
      if (!userId) {
        console.warn(
          `customer.subscription.deleted ${sub.id}: orphaned customer ${customerId}. Skipping.`
        )
        break
      }
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          tier: 'free',
          status: 'canceled',
          cancel_at_period_end: false,
          canceled_at: unixToIso(sub.canceled_at) ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      if (error) throw new Error(`subscription.deleted update failed: ${error.message}`)
      break
    }

    case 'invoice.paid': {
      // Subscription renewal succeeded — refresh period dates + status by
      // retrieving the fresh subscription.
      const invoice = event.data.object as Stripe.Invoice
      const subRef = (invoice as unknown as { subscription?: string | { id: string } | null })
        .subscription
      const subId =
        typeof subRef === 'string' ? subRef : subRef?.id ?? null
      if (!subId) break // not a subscription invoice
      const sub = await stripe.subscriptions.retrieve(subId)
      const ok = await syncSubscription(supabase, sub)
      if (!ok) console.warn(`invoice.paid ${invoice.id}: orphan/no-op.`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = customerIdOf(invoice.customer)
      if (!customerId) break
      const userId = await findUserIdByCustomer(supabase, customerId)
      if (!userId) {
        console.warn(
          `invoice.payment_failed ${invoice.id}: orphaned customer ${customerId}. Skipping.`
        )
        break
      }
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (error) throw new Error(`payment_failed update failed: ${error.message}`)
      break
    }

    default:
      // Unknown / unhandled event types must NOT crash — just log and ACK.
      if (process.env.NODE_ENV !== 'production') {
        console.log('Unhandled webhook type:', event.type)
      }
  }
}
