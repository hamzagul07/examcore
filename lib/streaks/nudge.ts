import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import { computeStreak } from '@/lib/dashboard/streak'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { sendStreakNudgeEmail } from '@/lib/email/streak-nudge'

// Once per user per day (the cron runs daily; this guards double-runs).
const DEDUP_MS = 20 * 60 * 60 * 1000
// Only nudge a streak worth protecting.
const MIN_STREAK = 2

/** Real emails go out only when explicitly enabled — ships OFF. In-app
 * notifications are always safe to create. */
function emailsEnabled(): boolean {
  return process.env.STREAK_NUDGE_SEND === 'true'
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Streak-at-risk nudge: for each user with an active streak (≥2 days) who hasn't
 * marked anything today, create an in-app "streak ends tonight" notification and
 * (if enabled) send a nudge email. Opt-out is `email_streak_reminders` + the
 * one-click `streak` unsubscribe token. Reuses the review-digest batch pattern.
 */
export async function sendStreakNudgeBatch(): Promise<{
  sent: number
  notified: number
  skipped: number
  candidates: number
}> {
  const admin = createServiceClient()
  const now = new Date()
  const todayKey = dayKey(now)
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yesterdayStart = `${dayKey(yesterday)}T00:00:00Z`
  const todayStart = `${todayKey}T00:00:00Z`
  const nowIso = now.toISOString()
  const dedupCutoff = new Date(now.getTime() - DEDUP_MS).toISOString()

  // Candidates = anyone who marked YESTERDAY. Their streak is live and breaks at
  // midnight unless they mark today — exactly who to nudge.
  const { data: rows } = await admin
    .from('attempts')
    .select('user_id')
    .gte('created_at', yesterdayStart)
    .lt('created_at', todayStart)
    .not('user_id', 'is', null)

  const candidates = [...new Set((rows ?? []).map((r) => r.user_id as string))]

  let sent = 0
  let notified = 0
  let skipped = 0

  for (const userId of candidates) {
    // select * so the new opt-out/dedup columns being absent doesn't error.
    const { data: profile } = await admin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (!profile) {
      skipped++
      continue
    }
    const lastSent = profile.streak_nudge_last_sent_at as string | null | undefined
    if (lastSent && lastSent > dedupCutoff) {
      skipped++
      continue
    }

    const { data: att } = await admin
      .from('attempts')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(90)

    const stamps = (att ?? []).map((a) => new Date(a.created_at as string))
    // Already marked today → streak safe, no nudge.
    if (stamps.some((d) => dayKey(d) === todayKey)) {
      skipped++
      continue
    }
    const streak = computeStreak(stamps)
    if (streak < MIN_STREAK) {
      skipped++
      continue
    }

    // In-app notification — always (no external send).
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'streak-risk',
      title: `🔥 Your ${streak}-day streak ends tonight`,
      href: '/mark',
    })
    notified++

    // Email — only when explicitly enabled and not opted out.
    if (emailsEnabled() && profile.email_streak_reminders !== false) {
      const { data: authData } = await admin.auth.admin.getUserById(userId)
      const email = authData?.user?.email
      if (email) {
        sendStreakNudgeEmail({
          to: email,
          recipientName: (profile.full_name as string | null) ?? null,
          streak,
          unsubscribeHref: unsubscribeUrl(userId, 'streak'),
        })
        sent++
      }
    }

    await admin
      .from('user_profiles')
      .update({ streak_nudge_last_sent_at: nowIso })
      .eq('id', userId)
  }

  return { sent, notified, skipped, candidates: candidates.length }
}
