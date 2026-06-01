import type { SupabaseClient } from '@supabase/supabase-js'

const ANON_DAILY_MARK_LIMIT = 10

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
  await supabase.from('rate_limits').upsert(
    { ip, date: today, mark_count: currentCount + 1 },
    { onConflict: 'ip,date' }
  )
}
