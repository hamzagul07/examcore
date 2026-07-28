/**
 * What the student actually built during the reverse trial.
 *
 * The trial's job is not to demonstrate features — a student who watched a
 * feature for seven days and then lost it is evaluating a *gain* they declined,
 * which is the weakest possible frame. The job is to leave them holding
 * something: marked scripts with ink on them, a weak-topic map that is accurate
 * because of their own work, a stated target with a measured distance to it.
 *
 * So this module answers one question — "what does this person now own?" — and
 * the panel built on it reports that back rather than listing what got switched
 * off. Nothing is ever deleted at the end of a trial; features go dormant and
 * the record stays. Copy that implies otherwise would be a lie, and this
 * audience checks.
 *
 * Pure over data the dashboard has already loaded, so it costs no extra query
 * beyond the subscription row.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeafMastery } from '@/lib/mastery'
import { topicTargetsFromMasteries } from '@/lib/insights/recommendations'
import { gapToTargetGrade } from '@/lib/target-grade'
import { ACTIVE_STATUSES } from './access'
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/database.types'

/** Length of the reverse trial. Mirrors the column default set in
 * 20260728_restore_reverse_trial.sql — used only to date the start of the
 * window we count work in, so a drift of a day is cosmetic, not a bug. */
export const REVERSE_TRIAL_DAYS = 7

/**
 * How long after expiry the dormancy panel keeps showing. Deliberately longer
 * than the "day 8" of the plan: a student who stops opening the app for a week
 * is exactly the one who should still meet this, and a panel that expired while
 * they were away would be a conversion event that never fired.
 */
export const DORMANCY_WINDOW_DAYS = 14

/** Days left at which the pre-expiry preview starts. Showing the loss before it
 * lands converts better than announcing it after, and it is the honest order:
 * the student gets to act while they still have the thing. */
export const ENDING_SOON_DAYS = 2

export type TrialPhase = 'ending_soon' | 'just_ended'

export type TrialSummary = {
  phase: TrialPhase
  /** Whole days remaining; 0 once ended. */
  daysLeft: number
  endsAt: string
  /** Scripts marked inside the trial window — the artefact count. */
  scriptsMarked: number
  marksEarned: number
  marksAvailable: number
  /** Weakest confirmed topic, chosen by the same ranking the drill card uses so
   * the panel and the drill it offers never name different topics. */
  weakest: { code: string; name: string; percentage: number } | null
  targetGrade: string | null
  /** Percentage points still to find to reach the target. Null for IB (no
   * Cambridge boundary) or when no target was ever set. */
  pointsToGo: number | null
  onTrack: boolean
  /** True when the trial produced nothing — the panel must not talk about
   * losing work that was never done. */
  empty: boolean
}

export type TrialAttempt = {
  marks_earned: number | null
  total_marks: number | null
  created_at: string
}

export type TrialSubscription = {
  tier: SubscriptionTier
  status: SubscriptionStatus
  trial_ends_at: string | null
}

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000
}

/**
 * Resolve which phase of the reverse trial the student is in, or null when the
 * panel has no business rendering — paying users, users who never had a trial,
 * and users whose trial ended long enough ago that the moment has passed.
 */
export function trialPhase(
  sub: TrialSubscription | null,
  now: Date = new Date()
): { phase: TrialPhase; daysLeft: number; endsAt: Date } | null {
  if (!sub?.trial_ends_at) return null

  // Someone who converted is not in a trial, whatever the column says. Checked
  // before anything else so an upgrade instantly removes the panel.
  const paidActive = sub.tier !== 'free' && ACTIVE_STATUSES.includes(sub.status)
  if (paidActive) return null

  const endsAt = new Date(sub.trial_ends_at)
  if (Number.isNaN(endsAt.getTime())) return null

  const remaining = daysBetween(now, endsAt)

  if (remaining > 0) {
    if (remaining > ENDING_SOON_DAYS) return null
    return { phase: 'ending_soon', daysLeft: Math.ceil(remaining), endsAt }
  }

  const sinceEnd = daysBetween(endsAt, now)
  if (sinceEnd > DORMANCY_WINDOW_DAYS) return null
  return { phase: 'just_ended', daysLeft: 0, endsAt }
}

export function buildTrialSummary({
  subscription,
  attempts,
  masteries = [],
  targetGrade = null,
  averagePct = null,
  now = new Date(),
}: {
  subscription: TrialSubscription | null
  attempts: TrialAttempt[]
  masteries?: LeafMastery[]
  targetGrade?: string | null
  /** Recent-form average, already computed for the grade track. Null when the
   * student has no scored attempts. */
  averagePct?: number | null
  now?: Date
}): TrialSummary | null {
  const phase = trialPhase(subscription, now)
  if (!phase) return null

  // Count only work done inside the trial. Marks from before it started are the
  // student's, but they are not what the trial produced, and claiming them
  // would inflate the number the panel is about to put in front of them.
  const startedAt = new Date(
    phase.endsAt.getTime() - REVERSE_TRIAL_DAYS * 86_400_000
  )
  const inWindow = attempts.filter((a) => {
    const at = new Date(a.created_at)
    return !Number.isNaN(at.getTime()) && at >= startedAt && at <= now
  })

  const scored = inWindow.filter(
    (a) =>
      typeof a.marks_earned === 'number' &&
      typeof a.total_marks === 'number' &&
      (a.total_marks as number) > 0
  )
  const marksEarned = scored.reduce((sum, a) => sum + (a.marks_earned as number), 0)
  const marksAvailable = scored.reduce(
    (sum, a) => sum + (a.total_marks as number),
    0
  )

  // Same ranking the WeakSpotDrillCard uses, so "this topic stays on the list"
  // and the drill offered underneath it are always the same topic.
  const target = topicTargetsFromMasteries(masteries, 1)[0] ?? null
  const weakestMastery = target
    ? masteries.find((m) => m.code === target.code) ?? null
    : null

  const gap =
    averagePct !== null ? gapToTargetGrade(Math.round(averagePct), targetGrade) : null

  return {
    phase: phase.phase,
    daysLeft: phase.daysLeft,
    endsAt: phase.endsAt.toISOString(),
    scriptsMarked: inWindow.length,
    marksEarned,
    marksAvailable,
    weakest:
      target && weakestMastery
        ? {
            code: target.code,
            name: target.name,
            percentage: Math.round(weakestMastery.percentage),
          }
        : null,
    targetGrade,
    pointsToGo: gap ? gap.pointsToGo : null,
    onTrack: gap ? gap.onTrack : false,
    empty: inWindow.length === 0,
  }
}

/**
 * Fetch the one row `buildTrialSummary` needs that the dashboard doesn't
 * already hold. Kept separate from the builder so the logic above stays pure.
 */
export async function loadTrialSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<TrialSubscription | null> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as TrialSubscription | null) ?? null
}
