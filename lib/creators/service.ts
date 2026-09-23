/**
 * Creators — the database half (docs/CREATORS_PROGRAM.md).
 *
 * Every read here uses the service role and returns only the fields a public
 * page may show. The `creators` table itself is service-role only (see
 * supabase/migrations/20260923_creators.sql), like teacher seats: a creator
 * seat carries a real allowance and a gift budget, so it is granted by hand
 * (`pnpm creator:grant`) and never claimed in the product.
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { normalizeUsername } from '@/lib/community/username'
import {
  buildCohortGapReport,
  type CohortGapReport,
  type GapAttempt,
} from '@/lib/teacher/cohort-gaps'
import { type CreatorRef, validateCreatorCode } from '@/lib/creators/codes'

export type CreatorLinks = {
  tiktok?: string
  instagram?: string
  youtube?: string
}

export type CreatorPublic = {
  userId: string
  /** The community username; the space lives at /with/<handle>. */
  handle: string
  displayName: string
  tagline: string | null
  links: CreatorLinks
  code: string
  giftMarks: number
  giftPoolMonthly: number
  status: 'active' | 'paused'
  isAdult: boolean
  /** ISO date the seat was granted. */
  since: string
}

type CreatorRow = {
  user_id: string
  code: string
  status: 'active' | 'paused'
  verified_at: string
  is_adult: boolean
  display_name: string | null
  tagline: string | null
  links: Record<string, unknown> | null
  gift_marks: number
  gift_pool_monthly: number
}

const CREATOR_COLUMNS =
  'user_id, code, status, verified_at, is_adult, display_name, tagline, links, gift_marks, gift_pool_monthly'

function cleanLinks(raw: Record<string, unknown> | null): CreatorLinks {
  const out: CreatorLinks = {}
  for (const key of ['tiktok', 'instagram', 'youtube'] as const) {
    const v = raw?.[key]
    if (typeof v === 'string' && v.trim()) out[key] = v.trim()
  }
  return out
}

/** Attach handles from user_profiles; a creator without a username has no space yet. */
async function attachHandles(
  admin: SupabaseClient,
  rows: CreatorRow[]
): Promise<CreatorPublic[]> {
  if (!rows.length) return []
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, username, full_name')
    .in(
      'id',
      rows.map((r) => r.user_id)
    )
  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      { username: p.username as string | null, fullName: p.full_name as string | null },
    ])
  )
  const out: CreatorPublic[] = []
  for (const r of rows) {
    const p = byId.get(r.user_id)
    if (!p?.username) continue
    out.push({
      userId: r.user_id,
      handle: p.username,
      displayName: (r.display_name || p.fullName || `@${p.username}`).trim(),
      tagline: r.tagline?.trim() || null,
      links: cleanLinks(r.links),
      code: r.code,
      giftMarks: r.gift_marks,
      giftPoolMonthly: r.gift_pool_monthly,
      status: r.status,
      isAdult: r.is_adult,
      since: r.verified_at,
    })
  }
  return out
}

export async function getCreatorByCode(rawCode: unknown): Promise<CreatorPublic | null> {
  const check = validateCreatorCode(rawCode)
  if (!check.ok) return null
  const admin = createServiceClient()
  const { data } = await admin
    .from('creators')
    .select(CREATOR_COLUMNS)
    .eq('code', check.code)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return null
  const [creator] = await attachHandles(admin, [data as CreatorRow])
  return creator ?? null
}

export async function getCreatorByHandle(rawHandle: string): Promise<CreatorPublic | null> {
  const handle = normalizeUsername(rawHandle.replace(/^@/, ''))
  if (!handle) return null
  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('username', handle)
    .maybeSingle()
  if (!profile) return null
  const { data } = await admin
    .from('creators')
    .select(CREATOR_COLUMNS)
    .eq('user_id', profile.id as string)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return null
  const [creator] = await attachHandles(admin, [data as CreatorRow])
  return creator ?? null
}

/** Any status — the creator's own dashboard shows a paused seat as paused. */
export async function getCreatorByUserId(userId: string): Promise<CreatorPublic | null> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('creators')
    .select(CREATOR_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  const [creator] = await attachHandles(admin, [data as CreatorRow])
  return creator ?? null
}

export async function resolveCreatorRef(ref: CreatorRef | null): Promise<CreatorPublic | null> {
  if (!ref) return null
  return ref.kind === 'code' ? getCreatorByCode(ref.value) : getCreatorByHandle(ref.value)
}

/**
 * The code to stamp on a mark run, or null. Called on the marking gate, so it
 * is one indexed lookup and never throws — an unknown code is simply dropped.
 */
export async function resolveCreatorCodeForRun(raw: unknown): Promise<string | null> {
  const check = validateCreatorCode(raw)
  if (!check.ok) return null
  try {
    const admin = createServiceClient()
    const { data } = await admin
      .from('creators')
      .select('code')
      .eq('code', check.code)
      .eq('status', 'active')
      .maybeSingle()
    return (data?.code as string | undefined) ?? null
  } catch (err) {
    console.warn('[creators] code lookup failed (mark continues)', err)
    return null
  }
}

// --- stats ------------------------------------------------------------------------

export type CreatorStats = {
  /** Every run opened with the code, whatever happened next. */
  runs: number
  /** Runs that produced a mark. The number on the public page. */
  marked: number
  markedThisMonth: number
  /** Marked answers by people with no account. */
  guestAnswers: number
  /** Distinct signed-in students who marked with the code. */
  students: number
  /** Accounts whose signup was attributed to this creator. */
  joined: number
  giftClaimedThisMonth: number
  giftPoolMonthly: number
}

function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export async function getCreatorStats(creator: CreatorPublic): Promise<CreatorStats> {
  const admin = createServiceClient()
  const since = monthStartIso()
  const runsQ = admin
    .from('mark_runs')
    .select('id', { count: 'exact', head: true })
    .eq('creator_code', creator.code)
  const markedQ = admin
    .from('mark_runs')
    .select('id', { count: 'exact', head: true })
    .eq('creator_code', creator.code)
    .eq('status', 'success')
  const monthQ = admin
    .from('mark_runs')
    .select('id', { count: 'exact', head: true })
    .eq('creator_code', creator.code)
    .eq('status', 'success')
    .gte('started_at', since)
  const guestQ = admin
    .from('mark_runs')
    .select('id', { count: 'exact', head: true })
    .eq('creator_code', creator.code)
    .eq('status', 'success')
    .is('user_id', null)
  const studentsQ = admin
    .from('mark_runs')
    .select('user_id')
    .eq('creator_code', creator.code)
    .eq('status', 'success')
    .not('user_id', 'is', null)
    .limit(5000)
  const joinedQ = admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', creator.userId)
  const claimsQ = admin
    .from('creator_code_claims')
    .select('marks_granted')
    .eq('creator_id', creator.userId)
    .gte('claimed_at', since)

  const [runs, marked, month, guest, students, joined, claims] = await Promise.all([
    runsQ,
    markedQ,
    monthQ,
    guestQ,
    studentsQ,
    joinedQ,
    claimsQ,
  ])

  const distinctStudents = new Set(
    (students.data ?? []).map((r) => r.user_id as string).filter(Boolean)
  )
  const giftClaimed = (claims.data ?? []).reduce(
    (sum, r) => sum + ((r.marks_granted as number) || 0),
    0
  )

  return {
    runs: runs.count ?? 0,
    marked: marked.count ?? 0,
    markedThisMonth: month.count ?? 0,
    guestAnswers: guest.count ?? 0,
    students: distinctStudents.size,
    joined: joined.count ?? 0,
    giftClaimedThisMonth: giftClaimed,
    giftPoolMonthly: creator.giftPoolMonthly,
  }
}

export type CreatorWithStats = CreatorPublic & { stats: CreatorStats }

/** Active creators, most answers marked first. */
export async function listCreators(): Promise<CreatorWithStats[]> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('creators')
    .select(CREATOR_COLUMNS)
    .eq('status', 'active')
    .order('verified_at', { ascending: true })
    .limit(200)
  const creators = await attachHandles(admin, (data ?? []) as CreatorRow[])
  const withStats = await Promise.all(
    creators.map(async (c) => ({ ...c, stats: await getCreatorStats(c) }))
  )
  return withStats.sort((a, b) => b.stats.marked - a.stats.marked)
}

// --- the audience gap report --------------------------------------------------------

/**
 * Where this creator's followers lose marks — the teacher cohort report keyed
 * to the code. Guests have no user id; each guest script counts as its own
 * student, which is the honest reading of "answers" rather than "people".
 */
export async function getAudienceGapReport(code: string): Promise<CohortGapReport> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('attempts')
    .select('id, user_id, marks_earned, total_marks, ai_marking')
    .eq('creator_code', code)
    .order('created_at', { ascending: false })
    .limit(2000)
  const attempts: GapAttempt[] = (data ?? []).map((r) => ({
    user_id: (r.user_id as string | null) ?? `guest:${r.id as string}`,
    marks_earned: r.marks_earned as number | null,
    total_marks: r.total_marks as number | null,
    ai_marking: (r.ai_marking as GapAttempt['ai_marking']) ?? null,
  }))
  return buildCohortGapReport(attempts)
}

export type CreatorRunRow = {
  id: string
  startedAt: string
  status: string
  subjectCode: string | null
  guest: boolean
  marksEarned: number | null
  totalMarks: number | null
}

/** The last few runs, anonymised: no names, no scripts, just the shape. */
export async function listRecentCreatorRuns(
  code: string,
  limit = 12
): Promise<CreatorRunRow[]> {
  const admin = createServiceClient()
  const { data: runs } = await admin
    .from('mark_runs')
    .select('id, started_at, status, subject_code, user_id, attempt_id')
    .eq('creator_code', code)
    .order('started_at', { ascending: false })
    .limit(limit)
  const rows = runs ?? []
  const attemptIds = rows.map((r) => r.attempt_id as string | null).filter(Boolean) as string[]
  const marks = new Map<string, { earned: number | null; total: number | null }>()
  if (attemptIds.length) {
    const { data: attempts } = await admin
      .from('attempts')
      .select('id, marks_earned, total_marks')
      .in('id', attemptIds)
    for (const a of attempts ?? []) {
      marks.set(a.id as string, {
        earned: a.marks_earned as number | null,
        total: a.total_marks as number | null,
      })
    }
  }
  return rows.map((r) => {
    const m = r.attempt_id ? marks.get(r.attempt_id as string) : undefined
    return {
      id: r.id as string,
      startedAt: r.started_at as string,
      status: r.status as string,
      subjectCode: (r.subject_code as string | null) ?? null,
      guest: !r.user_id,
      marksEarned: m?.earned ?? null,
      totalMarks: m?.total ?? null,
    }
  })
}

// --- claiming a code ------------------------------------------------------------------

export type ClaimResult =
  | { status: 'granted'; marksGranted: number; creator: CreatorPublic }
  | { status: 'already'; creator: CreatorPublic }
  | { status: 'exhausted'; creator: CreatorPublic }
  | { status: 'self'; creator: CreatorPublic }
  | { status: 'invalid' }

/**
 * A signed-in student uses a creator's code (or arrives through the creator's
 * link). Writes the attribution once, pays the gift once, and is safe to call
 * from every path that might see the code — the (creator, user) unique row is
 * the lock.
 */
export async function claimCreatorRef(opts: {
  userId: string
  ref: CreatorRef | null
}): Promise<ClaimResult> {
  const creator = await resolveCreatorRef(opts.ref)
  if (!creator) return { status: 'invalid' }
  if (creator.userId === opts.userId) return { status: 'self', creator }

  const admin = createServiceClient()

  // Attribution first: it is the number that matters to us, and it must not
  // depend on whether the gift pool has anything left this month.
  await admin
    .from('user_profiles')
    .update({ referred_by: creator.userId, referred_at: new Date().toISOString() })
    .eq('id', opts.userId)
    .is('referred_by', null)

  const since = monthStartIso()
  const { data: claims } = await admin
    .from('creator_code_claims')
    .select('marks_granted')
    .eq('creator_id', creator.userId)
    .gte('claimed_at', since)
  const claimedThisMonth = (claims ?? []).reduce(
    (sum, r) => sum + ((r.marks_granted as number) || 0),
    0
  )
  const poolLeft = Math.max(0, creator.giftPoolMonthly - claimedThisMonth)
  const marks = Math.min(creator.giftMarks, poolLeft)

  const { error: insertError } = await admin.from('creator_code_claims').insert({
    creator_id: creator.userId,
    code: creator.code,
    user_id: opts.userId,
    marks_granted: marks,
  })
  if (insertError) {
    // 23505 = the unique (creator, user) row already exists.
    if (insertError.code === '23505') return { status: 'already', creator }
    console.error('[creators] claim insert failed', insertError.message)
    return { status: 'already', creator }
  }

  if (marks <= 0) return { status: 'exhausted', creator }

  const metadata = {
    polar_order_id: `creator-${creator.code}-${opts.userId}`,
    product: 'creator_gift',
    source: 'creator_gift',
    creator_code: creator.code,
  }
  const { error } = await admin.rpc('try_apply_credit_topup', {
    p_user_id: opts.userId,
    p_credits: marks,
    p_metadata: metadata,
  })
  if (error) {
    console.error('[creators] gift grant failed', error.message)
    await admin
      .from('creator_code_claims')
      .update({ marks_granted: 0 })
      .eq('creator_id', creator.userId)
      .eq('user_id', opts.userId)
    return { status: 'exhausted', creator }
  }

  return { status: 'granted', marksGranted: marks, creator }
}
