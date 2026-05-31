/**
 * Get-or-create the Stripe customer for a Supabase user.
 *
 * CRITICAL: the link between Stripe and Supabase is the customer's
 * `metadata.supabase_user_id` — never email. We store the resulting customer id
 * on `user_subscriptions.stripe_customer_id` (written with the service-role
 * client so RLS doesn't block it).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe/server'

export async function getOrCreateStripeCustomer(
  service: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<string> {
  // The row should already exist (trigger/backfill), but upsert defensively.
  const { data: existing } = await service
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { supabase_user_id: user.id },
  })

  const { error } = await service
    .from('user_subscriptions')
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    // We created a Stripe customer but couldn't persist the link. Surface it so
    // the caller can decide; the customer is recoverable via metadata.
    throw new Error(`Failed to persist stripe_customer_id: ${error.message}`)
  }

  return customer.id
}
