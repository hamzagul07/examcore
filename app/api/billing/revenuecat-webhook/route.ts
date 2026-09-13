import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess, resolveEntitlement } from '@/lib/billing/entitlement-source'
import { FALLBACK_PAID_TIER, tierForStoreProduct } from '@/lib/store/products'
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/database.types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * In-app purchase entitlements from the App Store and Play Store, delivered by
 * RevenueCat.
 *
 * The app sets RevenueCat's app_user_id to the Supabase user id
 * (src/lib/iap.ts → Purchases.logIn), so events identify the account directly.
 *
 * Idempotency follows the Polar webhook: claim the delivery id BEFORE any side
 * effect, stamp processed_at only on success, release the claim on failure so a
 * retry can reprocess. See that route for the reasoning in full.
 */

/** Matches the Polar route: long enough for any handler, short enough to recover. */
const CLAIM_LEASE_MS = 10 * 60 * 1000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RevenueCatEvent = {
  id?: string
  type?: string
  app_user_id?: string
  original_app_user_id?: string
  aliases?: string[]
  product_id?: string
  new_product_id?: string
  entitlement_ids?: string[] | null
  store?: string
  environment?: string
  purchased_at_ms?: number | null
  expiration_at_ms?: number | null
  cancel_reason?: string | null
  transferred_from?: string[]
  transferred_to?: string[]
}

function isoOrNull(ms: number | null | undefined): string | null {
  return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

function storeName(store: string | undefined): string {
  switch ((store ?? '').toUpperCase()) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
      return 'app_store'
    case 'PLAY_STORE':
      return 'play_store'
    case 'STRIPE':
      return 'stripe'
    case 'PROMOTIONAL':
      return 'promotional'
    default:
      return 'unknown'
  }
}

/**
 * How each event type leaves the subscription.
 *
 * `null` means "this event does not describe entitlement" (TEST, TRANSFER —
 * handled separately). CANCELLATION deliberately keeps `active`: like Polar's
 * cancel-at-period-end, the student keeps access until it expires, and the later
 * EXPIRATION is what removes it.
 */
function stateForEvent(
  type: string
): { status: SubscriptionStatus; cancelAtPeriodEnd: boolean; entitled: boolean } | null {
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'TEMPORARY_ENTITLEMENT_GRANT':
    case 'PRODUCT_CHANGE':
      return { status: 'active', cancelAtPeriodEnd: false, entitled: true }
    case 'CANCELLATION':
    case 'SUBSCRIPTION_PAUSED':
      return { status: 'active', cancelAtPeriodEnd: true, entitled: true }
    case 'BILLING_ISSUE':
      // Dunning. past_due is in ACTIVE_STATUSES, so access continues — the same
      // grace the web subscribers get.
      return { status: 'past_due', cancelAtPeriodEnd: false, entitled: true }
    case 'EXPIRATION':
      return { status: 'canceled', cancelAtPeriodEnd: false, entitled: false }
    default:
      return null
  }
}

function authorised(req: NextRequest, secret: string): boolean {
  const header = req.headers.get('authorization') ?? ''
  const a = Buffer.from(header)
  const b = Buffer.from(secret)
  // timingSafeEqual throws on a length mismatch, so compare lengths first.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    console.error('[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET is not set')
    return new NextResponse('Webhook not configured', { status: 500 })
  }
  if (!authorised(req, secret)) {
    // RevenueCat sends the shared secret as the Authorization header verbatim.
    console.warn('[revenuecat-webhook] rejected an unauthorised delivery')
    return new NextResponse('Invalid signature', { status: 403 })
  }

  let event: RevenueCatEvent
  try {
    const body = (await req.json()) as { event?: RevenueCatEvent }
    if (!body?.event) throw new Error('missing event')
    event = body.event
  } catch (err) {
    console.error('[revenuecat-webhook] failed to parse event:', err)
    return new NextResponse('Invalid payload', { status: 400 })
  }

  const eventId = event.id
  const type = event.type ?? 'UNKNOWN'
  if (!eventId) {
    console.error('[revenuecat-webhook] event has no id; cannot dedupe')
    return new NextResponse('Missing event id', { status: 400 })
  }

  const supabase = createServiceClient()

  const { error: claimError } = await supabase.from('revenuecat_webhook_events').insert({
    id: eventId,
    type,
    payload: event as unknown as Record<string, unknown>,
    processed_at: null,
  })

  if (claimError) {
    if (claimError.code === '23505') {
      const { data: existing } = await supabase
        .from('revenuecat_webhook_events')
        .select('processed_at, claimed_at')
        .eq('id', eventId)
        .maybeSingle()

      if (existing?.processed_at) {
        return NextResponse.json({ received: true, duplicate: true })
      }

      const cutoff = new Date(Date.now() - CLAIM_LEASE_MS).toISOString()
      const { data: takenOver } = await supabase
        .from('revenuecat_webhook_events')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', eventId)
        .is('processed_at', null)
        .lt('claimed_at', cutoff)
        .select('id')

      if (!takenOver || takenOver.length === 0) {
        console.warn('[revenuecat-webhook] claim held by a live request:', eventId)
        return NextResponse.json({ error: 'Event still processing' }, { status: 409 })
      }
      console.warn('[revenuecat-webhook] recovering an abandoned claim:', eventId)
    } else {
      console.error('[revenuecat-webhook] claim insert failed:', claimError.message)
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }
  }

  try {
    await handleEvent(event, type, supabase)
    await supabase
      .from('revenuecat_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventId)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[revenuecat-webhook] processing error:', err)
    // Release the claim so RevenueCat's retry reprocesses. Safe because every
    // write below is an idempotent upsert keyed on user_id — there are no
    // counters or credit grants on this path.
    await supabase.from('revenuecat_webhook_events').delete().eq('id', eventId)
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------

async function handleEvent(event: RevenueCatEvent, type: string, supabase: SupabaseClient) {
  if (type === 'TRANSFER') {
    // The entitlement moved to another app_user_id. Clear it from everyone it
    // left; the destination gets its own event with its own entitlement state.
    const from = (event.transferred_from ?? []).filter((id) => UUID_RE.test(id))
    for (const userId of from) {
      await writeStoreSubscription(supabase, userId, {
        store: storeName(event.store),
        product_id: null,
        entitlement_ids: [],
        tier: 'free',
        status: 'canceled',
        cancel_at_period_end: false,
        canceled_at: new Date().toISOString(),
        current_period_start: null,
        current_period_end: null,
        environment: (event.environment ?? 'PRODUCTION').toUpperCase(),
        revenuecat_app_user_id: userId,
      })
    }
    return
  }

  const state = stateForEvent(type)
  if (!state) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[revenuecat-webhook] unhandled type:', type)
    }
    return
  }

  const userId = event.app_user_id ?? event.original_app_user_id ?? ''
  if (!UUID_RE.test(userId)) {
    // Anonymous ids ($RCAnonymousID:…) mean the purchase happened before the
    // student signed in. Nothing to grant, and retrying will not change that, so
    // ACK rather than making RevenueCat redeliver forever.
    console.warn(`[revenuecat-webhook] ${type}: app_user_id is not a Supabase user; skipping.`)
    return
  }

  // PRODUCT_CHANGE names the plan they are moving TO.
  const productId = event.new_product_id ?? event.product_id ?? null
  const mapped = tierForStoreProduct(productId)
  if (state.entitled && !mapped) {
    console.error(
      `[revenuecat-webhook] ${type}: unmapped product ${productId} — granting ${FALLBACK_PAID_TIER}. Add it to lib/store/products.ts.`
    )
  }
  const tier: SubscriptionTier = state.entitled ? (mapped ?? FALLBACK_PAID_TIER) : 'free'

  await writeStoreSubscription(supabase, userId, {
    store: storeName(event.store),
    product_id: productId,
    entitlement_ids: event.entitlement_ids ?? [],
    tier,
    status: state.status,
    cancel_at_period_end: state.cancelAtPeriodEnd,
    canceled_at: state.entitled ? null : new Date().toISOString(),
    current_period_start: isoOrNull(event.purchased_at_ms),
    current_period_end: isoOrNull(event.expiration_at_ms),
    environment: (event.environment ?? 'PRODUCTION').toUpperCase(),
    revenuecat_app_user_id: userId,
    store_transaction_id: null,
  })
}

type StoreRow = {
  store: string
  product_id: string | null
  entitlement_ids: string[]
  tier: SubscriptionTier
  status: SubscriptionStatus
  cancel_at_period_end: boolean
  canceled_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  environment: string
  revenuecat_app_user_id: string
  store_transaction_id?: string | null
}

async function writeStoreSubscription(
  supabase: SupabaseClient,
  userId: string,
  row: StoreRow
): Promise<void> {
  const { error } = await supabase
    .from('store_subscriptions')
    .upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() }, {
      onConflict: 'user_id',
    })
  if (error) throw new Error(`store_subscriptions upsert failed: ${error.message}`)

  await projectEntitlement(supabase, userId, row)
}

/**
 * Mirror the store entitlement into user_subscriptions.
 *
 * The gate (computeBillingSummary) resolves both sources itself, so this is not
 * what grants access — it exists because ~20 other places read
 * user_subscriptions directly: the billing page, the pricing page, and the email
 * campaigns. Without it, a student who paid in the app would be offered an
 * upgrade by email.
 *
 * The ownership rule keeps it safe: only ever write a row Polar is not actively
 * using, and only ever reset a row we wrote ourselves. A live web subscription is
 * never touched, so nothing a paying customer has can be destroyed here.
 */
async function projectEntitlement(
  supabase: SupabaseClient,
  userId: string,
  store: StoreRow
): Promise<void> {
  // A sandbox purchase must not become real access in production, or TestFlight
  // and internal testing would be a free premium tap.
  if (store.environment !== 'PRODUCTION' && process.env.NODE_ENV === 'production') {
    console.warn(`[revenuecat-webhook] ${store.environment} event: recorded, not projected.`)
    return
  }

  const { data: web, error: readError } = await supabase
    .from('user_subscriptions')
    .select('tier, status, current_period_start, current_period_end, provider')
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw new Error(`user_subscriptions read failed: ${readError.message}`)

  const polarIsUsingTheRow = web?.provider !== 'store' && grantsAccess(web)
  if (polarIsUsingTheRow) {
    // They pay on the web too. Leave the web plan on display; the gate still
    // resolves the stronger of the two.
    return
  }

  const weOwnTheRow = web?.provider === 'store'
  const resolved = resolveEntitlement(web?.provider === 'store' ? null : web, store)

  if (resolved.source === 'store' || weOwnTheRow) {
    const { error } = await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        provider: 'store',
        tier: resolved.tier,
        status: resolved.status,
        // Cleared rather than inherited: a row taken over from Polar would
        // otherwise keep claiming the web plan's monthly/yearly billing period.
        billing_period: null,
        current_period_start: resolved.current_period_start,
        current_period_end: resolved.current_period_end,
        cancel_at_period_end: store.cancel_at_period_end,
        canceled_at: store.canceled_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (error) throw new Error(`entitlement projection failed: ${error.message}`)
  }
}
