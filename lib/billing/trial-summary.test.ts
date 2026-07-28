import assert from 'node:assert/strict'
import {
  buildTrialSummary,
  trialPhase,
  DORMANCY_WINDOW_DAYS,
  ENDING_SOON_DAYS,
  type TrialSubscription,
} from '@/lib/billing/trial-summary'
import type { LeafMastery } from '@/lib/mastery'
import {
  capForAccess,
  omniCapForAccess,
  capForTier,
  TRIAL_MONTHLY_CAP,
  TRIAL_OMNI_CAP,
} from '@/lib/billing/caps'

const NOW = new Date('2026-07-28T09:00:00Z')

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 86_400_000).toISOString()
}

function sub(over: Partial<TrialSubscription> = {}): TrialSubscription {
  return {
    tier: 'free',
    status: 'active',
    trial_ends_at: daysFromNow(1),
    ...over,
  }
}

function attempt(pct: number, daysAgo: number) {
  return {
    marks_earned: pct,
    total_marks: 100,
    created_at: daysFromNow(-daysAgo),
  }
}

function leaf(over: Partial<LeafMastery> & { code: string }): LeafMastery {
  return {
    name: over.code,
    level: 'critical',
    percentage: 40,
    attemptsCount: 3,
    totalMarksEarned: 4,
    totalMarksAvailable: 10,
    ...over,
  } as LeafMastery
}

function main() {
  // ---- phase resolution -------------------------------------------------

  assert.equal(trialPhase(null, NOW), null, 'no subscription → no panel')
  assert.equal(
    trialPhase(sub({ trial_ends_at: null }), NOW),
    null,
    'never had a trial → no panel'
  )

  // A subscriber is not in a trial whatever the column says. This is the check
  // that makes the panel vanish the instant someone upgrades.
  assert.equal(
    trialPhase(sub({ tier: 'scholar', status: 'active' }), NOW),
    null,
    'paying users never see the trial panel'
  )
  assert.equal(
    trialPhase(sub({ tier: 'scholar', status: 'trialing' }), NOW),
    null,
    'a Polar checkout trial is not a reverse trial'
  )
  // ...but a lapsed subscriber with a stale trial date is back to free, and
  // ACTIVE_STATUSES must not treat 'canceled' as paid.
  assert.equal(
    trialPhase(sub({ tier: 'scholar', status: 'canceled', trial_ends_at: daysFromNow(-1) }), NOW)
      ?.phase,
    'just_ended'
  )

  assert.equal(
    trialPhase(sub({ trial_ends_at: daysFromNow(5) }), NOW),
    null,
    'mid-trial is quiet — the preview only starts near the end'
  )
  assert.equal(
    trialPhase(sub({ trial_ends_at: daysFromNow(ENDING_SOON_DAYS - 0.1) }), NOW)?.phase,
    'ending_soon'
  )
  assert.equal(
    trialPhase(sub({ trial_ends_at: daysFromNow(-0.5) }), NOW)?.phase,
    'just_ended'
  )
  assert.equal(
    trialPhase(sub({ trial_ends_at: daysFromNow(-(DORMANCY_WINDOW_DAYS + 1)) }), NOW),
    null,
    'the moment passes — a stale trial notice is just clutter'
  )
  assert.equal(
    trialPhase(sub({ trial_ends_at: 'not-a-date' }), NOW),
    null,
    'unparseable dates fail closed'
  )

  // ---- artefact counting ------------------------------------------------

  // Trial ended yesterday, so its window is the 7 days before that. The mark
  // from 10 days ago predates the trial and must not be claimed as its output.
  const ended = sub({ trial_ends_at: daysFromNow(-1) })
  const s = buildTrialSummary({
    subscription: ended,
    attempts: [attempt(60, 2), attempt(40, 3), attempt(90, 10)],
    masteries: [leaf({ code: 'Osmosis', percentage: 41.4, attemptsCount: 4 })],
    targetGrade: 'A',
    averagePct: 50,
    now: NOW,
  })!
  assert.equal(s.phase, 'just_ended')
  assert.equal(s.scriptsMarked, 2, 'work from before the trial is not the trial’s')
  assert.equal(s.marksEarned, 100)
  assert.equal(s.marksAvailable, 200)
  assert.equal(s.empty, false)
  assert.deepEqual(s.weakest, { code: 'Osmosis', name: 'Osmosis', percentage: 41 })
  // Cambridge A boundary is 70%; recent form 50 → 20 points to find.
  assert.equal(s.pointsToGo, 20)
  assert.equal(s.onTrack, false)

  // Zero work during the trial: the panel must know, because the copy that
  // mourns a record they never built is the copy that gets refunded.
  const emptySummary = buildTrialSummary({
    subscription: ended,
    attempts: [attempt(90, 10)],
    now: NOW,
  })!
  assert.equal(emptySummary.empty, true)
  assert.equal(emptySummary.scriptsMarked, 0)
  assert.equal(emptySummary.weakest, null)
  assert.equal(emptySummary.pointsToGo, null, 'no average → no invented gap')

  // IB target grades have no Cambridge boundary, so the gap line stays off
  // rather than inventing a percentage the student never sits against.
  const ib = buildTrialSummary({
    subscription: ended,
    attempts: [attempt(60, 2)],
    targetGrade: '7',
    averagePct: 60,
    now: NOW,
  })!
  assert.equal(ib.pointsToGo, null)

  // Already at target → no "you're N points off" line.
  const onTrack = buildTrialSummary({
    subscription: ended,
    attempts: [attempt(85, 2)],
    targetGrade: 'A',
    averagePct: 85,
    now: NOW,
  })!
  assert.equal(onTrack.onTrack, true)
  assert.equal(onTrack.pointsToGo, 0)

  // Unattempted topics are never named as a weakness — recommending a topic
  // the student has never touched is a guess wearing a statistic's clothes.
  const blind = buildTrialSummary({
    subscription: ended,
    attempts: [attempt(60, 2)],
    masteries: [leaf({ code: 'Never', level: 'unattempted', attemptsCount: 0 })],
    now: NOW,
  })!
  assert.equal(blind.weakest, null)

  // ---- trial caps -------------------------------------------------------

  // The trial borrows Scholar's features but not its volume: 120 marks handed
  // to an unverified, cardless account is an unbounded model bill.
  assert.equal(capForAccess('trial', 'scholar'), TRIAL_MONTHLY_CAP)
  assert.equal(omniCapForAccess('trial', 'scholar'), TRIAL_OMNI_CAP)
  assert.notEqual(TRIAL_MONTHLY_CAP, capForTier('scholar'))

  // ...and it must be strictly better than free, or the trial is a downgrade
  // and the whole endowment mechanism collapses.
  assert.ok(
    TRIAL_MONTHLY_CAP > capForTier('free'),
    'a trial that gives less than the free tier is worse than no trial'
  )

  // Everyone else is untouched — paid tiers keep their own caps.
  assert.equal(capForAccess('pro', 'scholar'), capForTier('scholar'))
  assert.equal(capForAccess('max', 'mastery'), capForTier('mastery'))
  assert.equal(capForAccess('free', 'free'), capForTier('free'))

  console.log('trial-summary tests passed')
}

main()
