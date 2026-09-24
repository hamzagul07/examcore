/**
 * Granting a creator seat — the one code path behind `pnpm creator:grant`
 * and the approve button in /admin/creators, so the two cannot drift.
 */
import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { validateUsername } from '@/lib/community/username'
import { validateCreatorCode } from '@/lib/creators/codes'

export type GrantCreatorSeatInput = {
  userId: string
  code: string
  /** Sets the community username when the account has none yet. */
  handle?: string | null
  displayName?: string | null
  tagline?: string | null
  links?: { tiktok?: string | null; instagram?: string | null; youtube?: string | null }
  /** Cash eligibility later on; set from evidence, never from the application alone. */
  isAdult?: boolean
  giftMarks?: number
  giftPoolMonthly?: number
  reason?: string | null
}

export type GrantCreatorSeatResult =
  | { ok: true; handle: string; code: string }
  | { ok: false; error: string }

export async function grantCreatorSeat(
  input: GrantCreatorSeatInput
): Promise<GrantCreatorSeatResult> {
  const codeCheck = validateCreatorCode(input.code)
  if (!codeCheck.ok) {
    return { ok: false, error: `Code is not usable (${codeCheck.reason}): 3–12 letters or digits.` }
  }
  const code = codeCheck.code
  const admin = createServiceClient()

  const { data: clash } = await admin
    .from('creators')
    .select('user_id')
    .eq('code', code)
    .neq('user_id', input.userId)
    .maybeSingle()
  if (clash) return { ok: false, error: `Code ${code} already belongs to another creator.` }

  // The space lives at /with/<username>; make sure there is one.
  const { data: profile } = await admin
    .from('user_profiles')
    .select('username, full_name')
    .eq('id', input.userId)
    .maybeSingle()
  let handle = (profile?.username as string | null) ?? null
  if (!handle) {
    const wanted = input.handle?.trim()
    if (!wanted) return { ok: false, error: 'The account has no username yet; pass a handle.' }
    const check = validateUsername(wanted)
    if (!check.ok) return { ok: false, error: `Handle "${wanted}" is not valid (3–20 of a-z 0-9 _).` }
    const { data: taken } = await admin
      .from('user_profiles')
      .select('id')
      .eq('username', check.username)
      .neq('id', input.userId)
      .maybeSingle()
    if (taken) return { ok: false, error: `@${check.username} is taken.` }
    const { error } = await admin
      .from('user_profiles')
      .upsert(
        { id: input.userId, username: check.username, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
    if (error) return { ok: false, error: `Could not set the username: ${error.message}` }
    handle = check.username
  }

  const links: Record<string, string> = {}
  for (const key of ['tiktok', 'instagram', 'youtube'] as const) {
    const v = input.links?.[key]?.trim()
    if (v) links[key] = v
  }
  const giftMarks = Math.min(50, Math.max(0, Math.round(input.giftMarks ?? 5)))
  const giftPoolMonthly = Math.min(5000, Math.max(0, Math.round(input.giftPoolMonthly ?? 200)))

  const { error } = await admin.from('creators').upsert(
    {
      user_id: input.userId,
      code,
      status: 'active',
      verified_at: new Date().toISOString(),
      verified_reason:
        input.reason?.trim() || `manual: ${new Date().toISOString().slice(0, 10)}`,
      is_adult: input.isAdult === true,
      display_name:
        input.displayName?.trim() || (profile?.full_name as string | null) || null,
      tagline: input.tagline?.trim() || null,
      links,
      gift_marks: giftMarks,
      gift_pool_monthly: giftPoolMonthly,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) return { ok: false, error: `Could not save the seat: ${error.message}` }
  return { ok: true, handle, code }
}

/** Paged listUsers: the admin API has no lookup-by-email. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createServiceClient()
  const wanted = email.trim().toLowerCase()
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === wanted)
    if (hit) return hit.id
    if (data.users.length < 200) break
  }
  return null
}
