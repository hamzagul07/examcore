/**
 * Get-or-create the Polar customer for a Supabase user.
 *
 * CRITICAL: the link between Polar and Supabase is the customer's `externalId`,
 * which we set to the Supabase `user.id` (analogous to the Stripe era's
 * `metadata.supabase_user_id`). We cache the resulting Polar customer id on
 * `user_subscriptions.polar_customer_id` (written with the service-role client
 * so RLS doesn't block it).
 *
 * Checkout links customers automatically via `externalCustomerId`, so this
 * helper mainly exists for the billing portal, which needs a customer to open a
 * session for even before the first purchase.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { polar } from '@/lib/polar/server'

export async function getOrCreatePolarCustomer(
  service: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<string> {
  // Fast path: cached on our row (trigger/backfill created the row already).
  const { data: existing } = await service
    .from('user_subscriptions')
    .select('polar_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.polar_customer_id) {
    return existing.polar_customer_id
  }

  // The customer may already exist on Polar (created by a prior checkout) —
  // look it up by external id before creating a new one.
  let customerId: string | null = null
  try {
    const found = await polar.customers.getExternal({ externalId: user.id })
    customerId = found.id
  } catch {
    // Not found (404) or transient — fall through to create.
  }

  if (!customerId) {
    const created = await polar.customers.create({
      email: user.email ?? `${user.id}@no-email.local`,
      externalId: user.id,
    })
    customerId = created.id
  }

  const { error } = await service
    .from('user_subscriptions')
    .upsert(
      {
        user_id: user.id,
        polar_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    throw new Error(`Failed to persist polar_customer_id: ${error.message}`)
  }

  return customerId
}
