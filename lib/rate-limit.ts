import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Guest marks per IP per day.
 *
 * Was 10, which inverted the entire quota ladder: a guest got ~300 marks a
 * month against 5/month for a signed-in free account and 50 for an $11
 * subscriber, so creating an account was a 60× downgrade and paying bought less
 * than clearing your cookies. Measured 2026-07-28 with 105 users and 1
 * subscriber.
 *
 * One is the taste — enough to see examiner ink land on your own words, which
 * is the moment that sells the product, and not enough to be a substitute for
 * having an account.
 */
export const ANON_DAILY_MARK_LIMIT = 1
export const ANON_DAILY_OMNI_LIMIT = 60
const ANON_DAILY_CONTACT_LIMIT = 5
const AUTH_DAILY_CONTACT_LIMIT = 20
const DAILY_SIGNUP_LIMIT = 3

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function todayUtc(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * IP-based daily cap applies to anonymous users only.
 * Signed-in users rely on subscription/credit quotas instead — avoids
 * shared school Wi‑Fi blocking legitimate students.
 */
export async function checkAnonymousMarkRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<{ allowed: true; count: number } | { allowed: false; message: string }> {
  if (userId) {
    return { allowed: true, count: 0 }
  }

  const today = todayUtc()
  const { data: existingLimit } = await supabase
    .from('rate_limits')
    .select('mark_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  const count = existingLimit?.mark_count ?? 0
  if (count >= ANON_DAILY_MARK_LIMIT) {
    return {
      allowed: false,
      // Sells the next step rather than saying "come back tomorrow" — the
      // student is standing at the exact moment the account is worth having,
      // with a marked script on screen they are about to lose.
      message:
        'That was your free guest mark. Create a free account to keep it — you also get 7 days of full access, no card.',
    }
  }

  return { allowed: true, count }
}

export async function incrementAnonymousMarkRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null,
  currentCount: number
): Promise<void> {
  if (userId) return
  const today = todayUtc()
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('contact_count, signup_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  await supabase.from('rate_limits').upsert(
    {
      ip,
      date: today,
      mark_count: currentCount + 1,
      contact_count: existing?.contact_count ?? 0,
      signup_count: existing?.signup_count ?? 0,
    },
    { onConflict: 'ip,date' }
  )
}

/**
 * Guest Omni-chat daily cap — persisted in the same IP/day bucket as guest
 * marks, so it survives deploys and is shared across serverless instances
 * (unlike the in-memory hourly burst guard in the route). Signed-in users are
 * metered by their account quota instead.
 */
export async function checkAnonymousOmniRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<{ allowed: true; count: number } | { allowed: false; message: string }> {
  if (userId) {
    return { allowed: true, count: 0 }
  }

  const today = todayUtc()
  const { data: existingLimit } = await supabase
    .from('rate_limits')
    .select('omni_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  const count = existingLimit?.omni_count ?? 0
  if (count >= ANON_DAILY_OMNI_LIMIT) {
    return {
      allowed: false,
      message:
        'Daily chat limit reached for guests. Create a free account for your own quota, or try again tomorrow.',
    }
  }

  return { allowed: true, count }
}

export async function incrementAnonymousOmniRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null,
  currentCount: number
): Promise<void> {
  if (userId) return
  const today = todayUtc()
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('mark_count, contact_count, signup_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  await supabase.from('rate_limits').upsert(
    {
      ip,
      date: today,
      omni_count: currentCount + 1,
      mark_count: existing?.mark_count ?? 0,
      contact_count: existing?.contact_count ?? 0,
      signup_count: existing?.signup_count ?? 0,
    },
    { onConflict: 'ip,date' }
  )
}

/**
 * Contact form spam guard — IP + day bucket shared with mark limits.
 * Signed-in users get a higher cap but are still limited.
 */
export async function checkContactRateLimit(
  supabase: SupabaseClient,
  ip: string,
  userId: string | null
): Promise<{ allowed: true; count: number } | { allowed: false; message: string }> {
  const today = todayUtc()
  const limit = userId ? AUTH_DAILY_CONTACT_LIMIT : ANON_DAILY_CONTACT_LIMIT

  const { data: existingLimit } = await supabase
    .from('rate_limits')
    .select('contact_count, signup_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  const count = existingLimit?.contact_count ?? 0
  if (count >= limit) {
    return {
      allowed: false,
      message: userId
        ? 'Too many messages sent today from this network. Email us directly or try again tomorrow.'
        : 'Too many messages sent today. Email us directly or try again tomorrow.',
    }
  }

  return { allowed: true, count }
}

export async function incrementContactRateLimit(
  supabase: SupabaseClient,
  ip: string,
  currentCount: number
): Promise<void> {
  const today = todayUtc()
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('mark_count, signup_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  await supabase.from('rate_limits').upsert(
    {
      ip,
      date: today,
      contact_count: currentCount + 1,
      mark_count: existing?.mark_count ?? 0,
      signup_count: existing?.signup_count ?? 0,
    },
    { onConflict: 'ip,date' }
  )
}

/** Early-access waitlist — strict IP cap to prevent spam signups. */
export async function checkSignupRateLimit(
  supabase: SupabaseClient,
  ip: string
): Promise<{ allowed: true; count: number } | { allowed: false; message: string }> {
  const today = todayUtc()
  const { data: existingLimit } = await supabase
    .from('rate_limits')
    .select('signup_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  const count = existingLimit?.signup_count ?? 0
  if (count >= DAILY_SIGNUP_LIMIT) {
    return {
      allowed: false,
      message: 'Too many signup attempts from this network today. Try again tomorrow.',
    }
  }

  return { allowed: true, count }
}

export async function incrementSignupRateLimit(
  supabase: SupabaseClient,
  ip: string,
  currentCount: number
): Promise<void> {
  const today = todayUtc()
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('mark_count, contact_count')
    .eq('ip', ip)
    .eq('date', today)
    .maybeSingle()

  await supabase.from('rate_limits').upsert(
    {
      ip,
      date: today,
      signup_count: currentCount + 1,
      mark_count: existing?.mark_count ?? 0,
      contact_count: existing?.contact_count ?? 0,
    },
    { onConflict: 'ip,date' }
  )
}
