import assert from 'node:assert/strict'
import {
  BACKOFF_GAP_MS,
  NOTIFICATION_COPY,
  backoffAllows,
  backoffGapMs,
  inQuietHours,
} from '@/lib/plan/notification-policy'
import { FORBIDDEN_NUDGE_WORDS, type RoadmapNotificationKind } from '@/lib/plan/roadmap-types'

// --- copy: every string free of the banned words, for every kind and context ---
const kinds: RoadmapNotificationKind[] = ['block_ready', 'after_commitment', 'adjusted_after_busy_day', 'milestone_close', 'morning_checkin']
const contexts = [
  {},
  { minutes: 40, subject: 'Mathematics', endsAt: '17:00', topic: 'Quadratics', daysLeft: 12, label: 'Tuition' },
  { minutes: 0, daysLeft: 1 },
  { minutes: 25, subject: 'Physics', daysLeft: 3 },
]
for (const kind of kinds) {
  for (const ctx of contexts) {
    const { title, body } = NOTIFICATION_COPY[kind](ctx)
    assert.ok(title.length > 0 && body.length > 0, `${kind} has a title and a body`)
    assert.ok(title.length <= 60, `${kind} title fits a notification: ${title}`)
    assert.ok(body.length <= 160, `${kind} body fits a notification: ${body}`)
    for (const word of FORBIDDEN_NUDGE_WORDS) {
      assert.ok(!title.toLowerCase().includes(word), `${kind} title must not say "${word}": ${title}`)
      assert.ok(!body.toLowerCase().includes(word), `${kind} body must not say "${word}": ${body}`)
    }
    assert.ok(!/!/.test(title + body), `${kind} has no exclamation marks`)
  }
}
assert.equal(NOTIFICATION_COPY.block_ready({ minutes: 40, subject: 'Chemistry' }).body, 'Your 40-minute Chemistry block is ready when you are.')
assert.equal(
  NOTIFICATION_COPY.after_commitment({ label: 'Tuition', endsAt: '17:00' }).body,
  'Tuition ends at 17:00 — your shorter revision block is ready.'
)
assert.equal(
  NOTIFICATION_COPY.adjusted_after_busy_day({}).body,
  'Yesterday was busy, so today was rebuilt around what matters most. Nothing stacked up — open today to see what changed.'
)
assert.equal(NOTIFICATION_COPY.milestone_close({}).body, 'One priority topic left before your next milestone — open the plan to start it.')
assert.match(NOTIFICATION_COPY.adjusted_after_busy_day({}).body, /open today to see what changed/, 'a fact and a next step')
assert.equal(NOTIFICATION_COPY.morning_checkin({ daysLeft: 12, minutes: 90 }).title, '12 days to go')
// Several papers ahead: the countdown names the nearest one, not the plan's last date.
assert.equal(NOTIFICATION_COPY.morning_checkin({ daysLeft: 12, minutes: 90, exam: 'Business Paper 1' }).title, '12 days to Business Paper 1')
assert.equal(NOTIFICATION_COPY.morning_checkin({ daysLeft: 1, minutes: 30, exam: 'Business Paper 1' }).title, 'Tomorrow. Light review, then stop.')
assert.equal(NOTIFICATION_COPY.morning_checkin({ daysLeft: 1 }).title, 'Tomorrow. Light review, then stop.')

// --- quiet hours, including a span that crosses midnight ---
const overnight = { start: '21:30', end: '07:30' }
assert.equal(inQuietHours(21 * 60 + 30, overnight), true, 'starts at 21:30')
assert.equal(inQuietHours(23 * 60 + 59, overnight), true, 'before midnight')
assert.equal(inQuietHours(0, overnight), true, 'midnight')
assert.equal(inQuietHours(7 * 60 + 29, overnight), true, 'just before it ends')
assert.equal(inQuietHours(7 * 60 + 30, overnight), false, 'the end is exclusive')
assert.equal(inQuietHours(12 * 60, overnight), false, 'midday')
const daytime = { start: '13:00', end: '15:00' }
assert.equal(inQuietHours(14 * 60, daytime), true)
assert.equal(inQuietHours(12 * 60 + 59, daytime), false)
assert.equal(inQuietHours(15 * 60, daytime), false)
assert.equal(inQuietHours(600, null), false, 'no quiet hours set')
assert.equal(inQuietHours(600, { start: '10:00', end: '10:00' }), false, 'an empty window is no window')

// --- backoff: daily, then every other day, then weekly ---
const now = new Date('2026-09-17T08:00:00Z')
const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
assert.equal(backoffGapMs(0), BACKOFF_GAP_MS.daily)
assert.equal(backoffGapMs(2), BACKOFF_GAP_MS.daily)
assert.equal(backoffGapMs(3), BACKOFF_GAP_MS.everyOtherDay)
assert.equal(backoffGapMs(5), BACKOFF_GAP_MS.everyOtherDay)
assert.equal(backoffGapMs(6), BACKOFF_GAP_MS.weekly)
assert.equal(backoffGapMs(40), BACKOFF_GAP_MS.weekly)

assert.equal(backoffAllows(0, null, now), true, 'never sent')
assert.equal(backoffAllows(0, ago(24), now), true, 'daily: yesterday morning')
assert.equal(backoffAllows(2, ago(24), now), true)
assert.equal(backoffAllows(3, ago(24), now), false, 'three unopened: yesterday is too soon')
assert.equal(backoffAllows(3, ago(48), now), true, 'three unopened: two days is fine')
assert.equal(backoffAllows(5, ago(47), now), true, 'a little early still counts as two days')
assert.equal(backoffAllows(6, ago(48), now), false, 'six unopened: weekly')
assert.equal(backoffAllows(6, ago(24 * 7), now), true)
assert.equal(backoffAllows(9, 'not a date', now), true, 'a corrupt timestamp never blocks forever')

console.log('notification-policy.test.ts: ok')
