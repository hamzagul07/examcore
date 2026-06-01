import type { SupabaseClient } from '@supabase/supabase-js'

export const ANON_DAILY_MARK_LIMIT = 10
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
      message:
        'Daily limit reached (10 marks per day for guests). Create a free account for your own quota, or try again tomorrow.',
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
