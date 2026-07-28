import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import {
  getAttemptSubjectCode,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'
import { calculateMastery, type AttemptLite, type LeafMastery } from '@/lib/mastery'
import { getSyllabusByCode } from '@/lib/syllabi'
import { predictGrade } from '@/lib/prediction'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { buildTrialSummary, type TrialSummary } from '@/lib/billing/trial-summary'
import { sendTrialEndEmail } from '@/lib/email/trial-end'

/**
 * The trial email batch — the counterpart to the in-app dormancy panel, for
 * students who don't return to the dashboard on their own.
 *
 * Two sends per trial, at most, each stamped so a daily cron can't repeat them:
 *   • 'ending_soon' — the day before expiry, while they still hold the thing
 *   • 'just_ended'  — the morning after
 *
 * Ships DARK, exactly like the weekly report: real sends require
 * TRIAL_EMAIL_SEND=true (and RESEND_API_KEY). Without it every run is a
 * dry-run that logs what it would have sent, so the selection logic can be
 * verified against real data before a single email leaves.
 */

/** Real emails go out only when explicitly enabled — ships OFF (dry-run). */
function emailsEnabled(): boolean {
  return process.env.TRIAL_EMAIL_SEND === 'true'
}

const DAY_MS = 86_400_000

/**
 * How wide a net each phase casts. Generous relative to a daily cron so a
 * skipped or late run still catches the student, with the sent-stamps (not the
 * window) doing the deduplication.
 */
const ENDING_SOON_WINDOW_MS = 1.5 * DAY_MS
const JUST_ENDED_WINDOW_MS = 2 * DAY_MS

/** Masteries across every treed subject the student has marked, weakest-first
 * — mirrors how the weekly report ranks, so the two emails never disagree
 * about which topic is the problem. */
function masteriesFor(attempts: AttemptWithPaper[]): LeafMastery[] {
  const subjects = new Set<string>()
  for (const a of attempts) {
    const c = getAttemptSubjectCode(a)
    if (c && getSyllabusByCode(c)?.length) subjects.add(c)
  }
  const all: LeafMastery[] = []
  for (const subject of subjects) {
    const subjectAttempts = attempts.filter(
      (a) => getAttemptSubjectCode(a) === subject
    ) as unknown as AttemptLite[]
    all.push(...calculateMastery(subjectAttempts, subject))
  }
  return all
}

/** Recent-form average for the target-grade gap. Cambridge only — an IB
 * student has no percentage boundary to be "N points" from. */
function averagePctFor(attempts: AttemptWithPaper[]): number | null {
  const counts = new Map<string, number>()
  for (const a of attempts) {
    const c = getAttemptSubjectCode(a)
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  let primary: string | null = null
  let best = 0
  for (const [c, n] of counts) {
    if (n > best) {
      best = n
      primary = c
    }
  }
  if (!primary || isIbSubjectCode(primary) || !getSyllabusByCode(primary)?.length) {
    return null
  }
  const subjectAttempts = attempts.filter(
    (a) => getAttemptSubjectCode(a) === primary
  ) as unknown as AttemptLite[]
  const prediction = predictGrade(subjectAttempts, calculateMastery(subjectAttempts, primary))
  return prediction.predictedGrade === '—' ? null : prediction.averagePercentage
}

export async function sendTrialEndBatch(): Promise<{
  sent: number
  considered: number
  skipped: number
  dryRun: boolean
}> {
  const admin = createServiceClient()
  const now = new Date()
  const nowIso = now.toISOString()

  // Anyone on a free tier whose trial boundary is close, in either direction.
  // Paid users are filtered here rather than later so an upgrade during the
  // trial silently removes them from the batch — which is the correct
  // behaviour and the one most easily got wrong.
  const { data: subs } = await admin
    .from('user_subscriptions')
    .select('user_id, tier, status, trial_ends_at')
    .eq('tier', 'free')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', new Date(now.getTime() - JUST_ENDED_WINDOW_MS).toISOString())
    .lte('trial_ends_at', new Date(now.getTime() + ENDING_SOON_WINDOW_MS).toISOString())

  let sent = 0
  let considered = 0
  let skipped = 0

  for (const sub of subs ?? []) {
    const userId = sub.user_id as string
    const endsAt = new Date(sub.trial_ends_at as string)
    const phase: TrialSummary['phase'] = endsAt.getTime() > now.getTime()
      ? 'ending_soon'
      : 'just_ended'

    // select * so a missing opt-out/stamp column (migration not yet applied)
    // degrades to "send once per run" rather than erroring the whole batch.
    const { data: profile } = await admin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (!profile || profile.email_trial_end === false) {
      skipped++
      continue
    }

    const stampColumn =
      phase === 'ending_soon' ? 'trial_ending_email_sent_at' : 'trial_end_email_sent_at'
    if (profile[stampColumn]) {
      skipped++
      continue
    }

    const { data: rawAttempts } = await admin
      .from('attempts')
      .select(
        'id, marks_earned, total_marks, syllabus_tags, created_at, mark_schemes ( paper_code )'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)
    const attempts = (rawAttempts || []) as unknown as AttemptWithPaper[]

    const summary = buildTrialSummary({
      subscription: {
        tier: sub.tier as 'free',
        status: sub.status as 'active',
        trial_ends_at: sub.trial_ends_at as string,
      },
      attempts,
      masteries: masteriesFor(attempts),
      targetGrade: (profile.target_grade as string | null) ?? null,
      averagePct: averagePctFor(attempts),
      now,
    })

    // trialPhase() and this batch use different windows on purpose (the panel
    // lingers, the email fires once), so a summary can come back null at the
    // edges. Nothing to say without one.
    if (!summary) {
      skipped++
      continue
    }

    considered++

    if (emailsEnabled()) {
      const { data: authData } = await admin.auth.admin.getUserById(userId)
      const email = authData?.user?.email
      if (email) {
        sendTrialEndEmail({
          to: email,
          recipientName: (profile.full_name as string | null) ?? null,
          data: { ...summary, phase },
          unsubscribeHref: unsubscribeUrl(userId, 'trial'),
        })
        sent++
      } else {
        skipped++
      }
    } else {
      console.log(
        '[trial-end] dry-run — would send',
        phase,
        'to',
        userId,
        JSON.stringify(summary)
      )
    }

    await admin
      .from('user_profiles')
      .update({ [stampColumn]: nowIso })
      .eq('id', userId)
  }

  return { sent, considered, skipped, dryRun: !emailsEnabled() }
}
