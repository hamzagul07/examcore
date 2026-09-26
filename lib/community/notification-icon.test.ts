/** Run: npx tsx lib/community/notification-icon.test.ts */
import assert from 'node:assert/strict'
import { NOTIFICATIONS_EMPTY_TEXT, notificationIcon } from '@/lib/community/notification-icon'

// Existing community glyphs are unchanged.
assert.equal(notificationIcon('reply'), '↩')
assert.equal(notificationIcon('upvote'), '↑')
assert.equal(notificationIcon('comment_upvote'), '↑')
assert.equal(notificationIcon('review-due'), '→')

// Every teacher-system notification type has its own glyph, none the fallback.
const teacherTypes = [
  'assignment_set',
  'assignment_due',
  'submission_received',
  'mark_reviewed',
  'teacher_feedback',
  'class_removed',
  'seat_decision',
]
for (const t of teacherTypes) assert.notEqual(notificationIcon(t), '#', t)
assert.equal(new Set(teacherTypes.map(notificationIcon)).size, teacherTypes.length, 'distinct glyphs')

// Unknown and prototype keys fall back rather than leaking Object members.
assert.equal(notificationIcon('something_new'), '#')
assert.equal(notificationIcon('toString'), '#')
assert.equal(notificationIcon('__proto__'), '#')

// Each glyph is a single character, so the icon cell never grows.
for (const t of [...teacherTypes, 'reply', 'digest', 'mention', 'milestone', 'thread', 'moderation']) {
  assert.equal([...notificationIcon(t)].length, 1, t)
}

// The empty state no longer assumes the reader posts in the Exam Room.
assert.doesNotMatch(NOTIFICATIONS_EMPTY_TEXT, /Exam Room/)

console.log('notification-icon.test.ts — all assertions passed')
